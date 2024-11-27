let isActive = false;
let overlay = null;
let lastTarget = null;
let mouseInOverlay = false;
let overlayTimeout = null;

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
    const info = {
        tag: element.tagName.toLowerCase(),
        xpath: getXPath(element),
        id: element.id || '',
        class: element.className || '',
        name: element.getAttribute('name') || '',
        cssSelector: ''
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

function createOverlay() {
    const div = document.createElement('div');
    div.className = 'anyspy-overlay';
    div.innerHTML = `
        <div class="anyspy-content">
            <div class="anyspy-row">
                <span>XPath:</span>
                <input type="text" class="anyspy-xpath" readonly>
                <button class="anyspy-copy">Copy</button>
            </div>
            <div class="anyspy-row">
                <span>CSS:</span>
                <input type="text" class="anyspy-css" readonly>
                <button class="anyspy-copy">Copy</button>
            </div>
            <div class="anyspy-row">
                <span>ID:</span>
                <input type="text" class="anyspy-id" readonly>
                <button class="anyspy-copy">Copy</button>
            </div>
        </div>
    `;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'anyspy-toast';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    
    return div;
}

function updateOverlay(info, event) {
    if (!overlay || !isActive) return;
    
    const { clientX, clientY } = event;
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
}

function handleMouseOver(event) {
    if (!isActive) return;
    
    const target = event.target;
    
    // 如果鼠标在悬浮框内，不做处理
    if (target.closest('.anyspy-overlay')) {
        mouseInOverlay = true;
        if (overlayTimeout) {
            clearTimeout(overlayTimeout);
            overlayTimeout = null;
        }
        return;
    }
    
    mouseInOverlay = false;
    
    // 避免重复处理相同元素
    if (target === lastTarget) return;
    
    lastTarget = target;
    
    if (target.tagName.toLowerCase() === 'body') return;
    
    event.stopPropagation();
    const info = getElementInfo(target);
    updateOverlay(info, event);
    
    target.style.outline = '2px solid #ff0000';
}

function handleMouseOut(event) {
    if (!isActive) return;
    
    const target = event.target;
    
    // 如果移出的是悬浮框，设置延时隐藏
    if (target.closest('.anyspy-overlay')) {
        mouseInOverlay = false;
        if (!overlayTimeout) {
            overlayTimeout = setTimeout(() => {
                if (!mouseInOverlay && overlay) {
                    overlay.style.display = 'none';
                }
            }, 200);
        }
        return;
    }
    
    target.style.outline = '';
    lastTarget = null;
    
    // 如果鼠标不在悬浮框内，延时隐藏悬浮框
    if (!mouseInOverlay && !overlayTimeout) {
        overlayTimeout = setTimeout(() => {
            if (!mouseInOverlay && overlay) {
                overlay.style.display = 'none';
            }
        }, 200);
    }
}

function handleMouseMove(event) {
    if (!isActive || mouseInOverlay) return;
    
    if (overlay && overlay.style.display === 'none') {
        overlay.style.display = 'block';
    }
    
    handleMouseOver(event);
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

function setupOverlay() {
    if (!overlay) {
        overlay = createOverlay();
        document.body.appendChild(overlay);
        
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
                    }
                }, 200);
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('anyspy-copy')) {
                const input = e.target.previousElementSibling;
                copyToClipboard(input.value, e.target);
            }
        });
    }
}

function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
}

document.addEventListener('ANYSPY_TOGGLE', (event) => {
    isActive = event.detail;
    
    if (isActive) {
        setupOverlay();
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('mousemove', handleMouseMove);
    } else {
        removeOverlay();
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('mousemove', handleMouseMove);
    }
});
