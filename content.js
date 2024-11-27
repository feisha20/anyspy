let isActive = false;
let overlay = null;

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
    return div;
}

function updateOverlay(info, event) {
    if (!overlay) return;
    
    const { clientX, clientY } = event;
    overlay.style.left = `${clientX + 10}px`;
    overlay.style.top = `${clientY + 10}px`;

    const xpathInput = overlay.querySelector('.anyspy-xpath');
    const cssInput = overlay.querySelector('.anyspy-css');
    const idInput = overlay.querySelector('.anyspy-id');

    xpathInput.value = info.xpath;
    cssInput.value = info.cssSelector;
    idInput.value = info.id;
}

function handleMouseOver(event) {
    if (!isActive) return;
    
    event.stopPropagation();
    const target = event.target;
    
    if (target.closest('.anyspy-overlay')) return;
    
    const info = getElementInfo(target);
    updateOverlay(info, event);
    
    target.style.outline = '2px solid #ff0000';
}

function handleMouseOut(event) {
    if (!isActive) return;
    event.target.style.outline = '';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Could add a toast notification here
    });
}

function setupOverlay() {
    if (!overlay) {
        overlay = createOverlay();
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('anyspy-copy')) {
                const input = e.target.previousElementSibling;
                copyToClipboard(input.value);
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
    } else {
        removeOverlay();
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
    }
});
