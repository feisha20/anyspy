let isActive = false;
let overlay = null;
let lastTarget = null;
let mouseInOverlay = false;
let overlayTimeout = null;
let mainWindow = window.top;
let isIframe = window !== window.top;

// 获取元素的完整XPath，包括iframe路径
function getFullXPath(element) {
    let xpath = '';
    let doc = element.ownerDocument;
    let win = doc.defaultView;
    
    // 如果元素在iframe中，先获取iframe的路径
    while (win !== window.top) {
        const frame = win.frameElement;
        if (!frame) break;
        
        const frameXPath = getXPath(frame);
        xpath = frameXPath + xpath;
        
        win = win.parent;
    }
    
    // 添加元素自身的XPath
    xpath += getXPath(element);
    return xpath;
}

function getXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;
    if (element === document.body) return '/html/body';

    let path = '';
    while (element.parentElement) {
        const siblings = Array.from(element.parentElement.children);
        const similarSiblings = siblings.filter(e => e.tagName === element.tagName);
        const index = similarSiblings.indexOf(element) + 1;
        
        const tagName = element.tagName.toLowerCase();
        const position = similarSiblings.length === 1 ? '' : `[${index}]`;
        path = `/${tagName}${position}${path}`;
        
        element = element.parentElement;
    }
    return path;
}

function getElementInfo(element) {
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    
    const info = {
        tag: element.tagName.toLowerCase(),
        xpath: getFullXPath(element),
        id: element.id || '',
        class: element.className || '',
        name: element.getAttribute('name') || '',
        cssSelector: '',
        frame: win !== window.top ? 'iframe' : 'main'
    };

    // Generate CSS Selector
    if (info.id) {
        info.cssSelector = `#${info.id}`;
    } else if (info.class) {
        info.cssSelector = `.${info.class.split(' ').join('.')}`;
    } else {
        info.cssSelector = info.xpath;
    }

    return info;
}

function updateOverlay(info, event) {
    if (!isActive) return;

    if (isIframe) {
        // 如果在iframe中，将事件信息发送到主页面
        const rect = event.target.getBoundingClientRect();
        const frameRect = window.frameElement.getBoundingClientRect();
        
        mainWindow.postMessage({
            type: 'ANYSPY_UPDATE_OVERLAY',
            detail: {
                info: info,
                position: {
                    clientX: event.clientX + frameRect.left,
                    clientY: event.clientY + frameRect.top,
                    elementRect: {
                        top: rect.top + frameRect.top,
                        left: rect.left + frameRect.left,
                        width: rect.width,
                        height: rect.height
                    }
                }
            }
        }, '*');
    } else {
        // 在主页面中直接更新悬浮框
        updateOverlayPosition(info, event.clientX, event.clientY);
    }
}

// 更新悬浮框位置的核心逻辑
function updateOverlayPosition(info, clientX, clientY) {
    if (!overlay || !isActive) return;
    
    const overlayRect = overlay.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // 计算最佳位置
    let left = clientX + 10;
    let top = clientY + 10;
    
    // 确保不超出右边界
    if (left + overlayRect.width > viewportWidth) {
        left = clientX - overlayRect.width - 10;
    }
    
    // 确保不超出下边界
    if (top + overlayRect.height > viewportHeight) {
        top = clientY - overlayRect.height - 10;
    }
    
    // 确保不超出左边界和上边界
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    
    const xpathInput = overlay.querySelector('.anyspy-xpath');
    const cssInput = overlay.querySelector('.anyspy-css');
    const idInput = overlay.querySelector('.anyspy-id');
    
    xpathInput.value = info.xpath;
    cssInput.value = info.cssSelector;
    idInput.value = info.id;
    
    overlay.style.display = 'block';
}

function setupOverlay() {
    // 只在主页面创建悬浮框
    if (isIframe) return;
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'anyspy-overlay';
        overlay.innerHTML = `
            <div class="anyspy-content">
                <div class="anyspy-row">
                    <button onclick="navigator.clipboard.writeText(this.nextElementSibling.nextElementSibling.value)">
                        <svg viewBox="0 0 24 24">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        COPY
                    </button>
                    <label>XPath:</label>
                    <input type="text" class="anyspy-xpath" readonly>
                </div>
                <div class="anyspy-row">
                    <button onclick="navigator.clipboard.writeText(this.nextElementSibling.nextElementSibling.value)">
                        <svg viewBox="0 0 24 24">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        COPY
                    </button>
                    <label>CSS:</label>
                    <input type="text" class="anyspy-css" readonly>
                </div>
                <div class="anyspy-row">
                    <button onclick="navigator.clipboard.writeText(this.nextElementSibling.nextElementSibling.value)">
                        <svg viewBox="0 0 24 24">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        COPY
                    </button>
                    <label>ID:</label>
                    <input type="text" class="anyspy-id" readonly>
                </div>
            </div>
        `;
        
        // 监听悬浮框的鼠标事件
        overlay.addEventListener('mouseenter', () => {
            mouseInOverlay = true;
            if (overlayTimeout) {
                clearTimeout(overlayTimeout);
                overlayTimeout = null;
            }
        });
        
        overlay.addEventListener('mouseleave', () => {
            mouseInOverlay = false;
            if (!overlayTimeout) {
                overlayTimeout = setTimeout(() => {
                    if (!mouseInOverlay && overlay) {
                        overlay.style.display = 'none';
                        if (!mouseInOverlay) {
                            removeAllHighlights();
                            lastTarget = null;
                        }
                    }
                }, 200);
            }
        });

        // 添加复制成功的提示元素
        const toast = document.createElement('div');
        toast.className = 'anyspy-toast';
        toast.textContent = 'Copied to clipboard!';
        document.body.appendChild(toast);
        
        // 添加复制事件监听
        overlay.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                const toast = document.querySelector('.anyspy-toast');
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 1500);
                }
            });
        });
        
        document.body.appendChild(overlay);
    }
}

function highlightElement(element) {
    // 确保先清除所有已存在的高亮
    const highlightedElements = document.querySelectorAll('[data-anyspy-highlight="true"]');
    highlightedElements.forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-anyspy-highlight');
    });

    // 设置新的高亮
    if (element && element !== document.body) {
        element.style.outline = '2px solid #ff0000';
        element.setAttribute('data-anyspy-highlight', 'true');
    }
}

function removeHighlight(element) {
    if (element) {
        element.style.outline = '';
        element.removeAttribute('data-anyspy-highlight');
    }
}

function removeAllHighlights() {
    const highlightedElements = document.querySelectorAll('[data-anyspy-highlight="true"]');
    highlightedElements.forEach(el => {
        el.style.outline = '';
        el.removeAttribute('data-anyspy-highlight');
    });
}

function handleMouseOver(event) {
    if (!isActive) return;
    
    const target = event.target;
    
    // 如果鼠标在悬浮框内，保持最后一个元素的标识
    if (target.closest('.anyspy-overlay')) {
        mouseInOverlay = true;
        if (overlayTimeout) {
            clearTimeout(overlayTimeout);
            overlayTimeout = null;
        }
        // 确保在悬浮框内时保持上一个元素的高亮
        if (lastTarget) {
            highlightElement(lastTarget);
        }
        return;
    }
    
    mouseInOverlay = false;
    
    // 如果目标是新元素，更新高亮
    if (target !== lastTarget) {
        if (target.tagName.toLowerCase() !== 'body') {
            lastTarget = target;
            highlightElement(target);
            
            event.stopPropagation();
            const info = getElementInfo(target);
            updateOverlay(info, event);
        }
    }
}

function handleMouseOut(event) {
    if (!isActive) return;
    
    const target = event.target;
    
    // 如果移出的是悬浮框
    if (target.closest('.anyspy-overlay')) {
        mouseInOverlay = false;
        if (!overlayTimeout) {
            overlayTimeout = setTimeout(() => {
                if (!mouseInOverlay && overlay) {
                    overlay.style.display = 'none';
                    // 只有当真正隐藏悬浮框时才移除高亮
                    if (!mouseInOverlay) {
                        removeAllHighlights();
                        lastTarget = null;
                    }
                }
            }, 200);
        }
        return;
    }
    
    // 如果鼠标在悬浮框内，保持高亮
    if (mouseInOverlay && lastTarget) {
        highlightElement(lastTarget);
        return;
    }
    
    // 如果移出的是当前高亮的元素，且鼠标不在悬浮框内
    if (target === lastTarget && !mouseInOverlay) {
        // 给一个短暂的延时，以便检查是否移动到了悬浮框
        setTimeout(() => {
            if (!mouseInOverlay) {
                removeAllHighlights();
                lastTarget = null;
            }
        }, 50);
    }
}

function handleMouseMove(event) {
    if (!isActive || mouseInOverlay) return;
    
    if (overlay && overlay.style.display === 'none') {
        overlay.style.display = 'block';
    }
    
    handleMouseOver(event);
}

function handleKeyPress(event) {
    // 按ESC键退出
    if (event.key === 'Escape' && isActive) {
        isActive = false;
        removeAllHighlights();
        lastTarget = null;
        removeOverlay();
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyPress);
    }
}

function setupEventListeners() {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    // 添加光标样式类
    document.body.classList.add('anyspy-active');
}

function removeEventListeners() {
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('keydown', handleKeyPress);
    // 移除光标样式类
    document.body.classList.remove('anyspy-active');
}

function showToast() {
    const toast = document.querySelector('.anyspy-toast');
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        // Add success class to button
        button.classList.add('success');
        button.textContent = '';  // Clear text for checkmark
        
        // Show toast notification
        showToast();
        
        // Reset button after animation
        setTimeout(() => {
            button.classList.remove('success');
            button.textContent = 'Copy';
        }, 1500);
    });
}

function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
}

// 在主页面中监听来自iframe的消息
if (!isIframe) {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'ANYSPY_UPDATE_OVERLAY' && isActive) {
            const { info, position } = event.data.detail;
            updateOverlayPosition(info, position.clientX, position.clientY);
            
            // 清除主页面中可能存在的高亮
            removeAllHighlights();
        }
    });
}

// 在iframe中创建一个消息通道与主页面通信
if (isIframe) {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'ANYSPY_TOGGLE') {
            document.dispatchEvent(new CustomEvent('ANYSPY_TOGGLE', { detail: event.data.detail }));
        }
    });
}

// 在主页面中，当切换状态时通知所有iframe
function notifyFrames(active) {
    const frames = Array.from(document.getElementsByTagName('iframe'));
    frames.forEach(frame => {
        try {
            frame.contentWindow.postMessage({
                type: 'ANYSPY_TOGGLE',
                detail: active
            }, '*');
        } catch (e) {
            console.warn('Failed to notify iframe:', e);
        }
    });
}

document.addEventListener('ANYSPY_TOGGLE', (event) => {
    isActive = event.detail;
    
    if (isActive) {
        setupOverlay();
        setupEventListeners();
        if (!isIframe) {
            notifyFrames(true);
        }
    } else {
        removeAllHighlights();
        lastTarget = null;
        removeOverlay();
        removeEventListeners();
        if (!isIframe) {
            notifyFrames(false);
        }
    }
});
