var backdropElement = undefined;
// -1 is closed, +1 is opened
var backdropState = -1;
var backdropFadeDuration = 150;
var messagePopDuration = 100;
var messageFadeDuration = 100;
var messagesCounter = 0;

init();

function init() {

    backdropElement = document.querySelector('#backdrop');

    if(!backdropElement) {
        throw new Error('backdrop element not detected');
    }
}

// creates a message modal
function createMessageModal(isError, messageLines, buttonText='', buttonCallBack=undefined) {

    // set up message line elements
    let lines = [];
    messageLines.forEach((line, index) => {
        lines.push(document.createElement('p'));
        lines[index].innerText = line;
        lines[index].classList.add('message_line');
    });
    
    // set up message button (if applicable)
    let buttonElement;
    if(buttonCallBack) {
        buttonElement = document.createElement('button');
        buttonElement.innerText = buttonText;
        buttonElement.classList.add('message_button');
        buttonElement.addEventListener('click', buttonCallBack);
    }
    
    // set up dialog element
    let dialogElement = document.createElement('dialog');
    lines.forEach((element) => {
        dialogElement.appendChild(element);
    });

    if(buttonCallBack) {
        dialogElement.appendChild(buttonElement);
    }
    
    dialogElement.classList.add('message_dialog');

    if(isError) {
        dialogElement.classList.add('message_dialog_error_theme');
    }

    document.body.appendChild(dialogElement);

    return dialogElement;
}

// creates and pops in a modal message
export function popInMessage(isError, messageLines, buttonText='', buttonCallback=undefined, popCallback=undefined) {

    // creates a message modal
    const messageModal = createMessageModal(isError, messageLines, buttonText, buttonCallback);

    // if backdrop is not faded in already, then we want to fade it in first.
    // so we need to calculate when its the right time to pop in the message modal


    popInModal(messageModal, popCallback);
    return messageModal;

    const timeToPopModal = backdropState == -1 ? backdropFadeDuration : 0;

    // pop in the message modal at the right time
    setTimeout(() => {

        modalPop(messageModal, 1, messagePopDuration, messageFadeDuration, popCallback);

    }, timeToPopModal);

    // call the pop in callback if applicable, at the right time
    if(popCallback) {

        setTimeout(() => {

            popCallback();

        }, messagePopDuration + messageFadeDuration);
    }

    // call backdrop fade in inmediately
    messagesCounter++;
    backdropFade(1, backdropFadeDuration);
    
    return messageModal;
}

export function popInModal(messageModal, popCallback=undefined) {

    const timeToPopModal = backdropState == -1 ? backdropFadeDuration : 0;

    // pop in the message modal at the right time
    setTimeout(() => {

        modalPop(messageModal, 1, messagePopDuration, messageFadeDuration, popCallback);

    }, timeToPopModal);

    // call the pop in callback if applicable, at the right time
    if(popCallback) {

        setTimeout(() => {

            popCallback();

        }, messagePopDuration + messageFadeDuration);
    }

    // call backdrop fade in inmediately
    messagesCounter++;
    backdropFade(1, backdropFadeDuration);

    return messageModal;
}

// pops out a modal message
export function popOutMessage(messageElement, popOutCallback=undefined) {

    // calculate when its the right time to fade out the backdrop if any
    const timeToFadeBackdrop = backdropState == 1 ? messagePopDuration + messageFadeDuration : 0;

    // pop out the message modal inmediately
    modalPop(messageElement, -1, messagePopDuration, messageFadeDuration, true);

    // fade out the backdrop
    setTimeout(() => {
        
        if(popOutCallback) {
            popOutCallback();
        }
        
        messagesCounter--;
        backdropFade(-1, backdropFadeDuration);

    }, timeToFadeBackdrop);
}

// modal pop animation
function modalPop(modalElement, dir, popTime, fadeTime, delOnFinish=false) {

    // just in case
    dir = dir > 0 ? 1 : -1;

    if(dir > 0) {
        // if we meant to open the modal we first set opacity to 0 so that we dont
        // see it full dimensions for a tick or two
        modalElement.style.opacity = 0;
    }

    // get all interactible children and disable them. Add any other element to the list below
    let interactibles = Array.from(modalElement.querySelectorAll('button, textarea, input'));

    // prevents the scrollbar to show while the pop animation happens.
    modalElement.style.overflow = 'hidden';

    interactibles.forEach((element) => {
        element.disabled = true;
    });

    // we then call open on it. If we meant to open it this is the step and it not
    // its already openened so it doesnt matter.
    // we need to always first open it so that the computed values come out int pixel
    // units. This will allow us to open and close it multiple times without the 
    // modal breaking due to computed values using two measures (% and px).
    // he reason for this is that a modal that has not been opened before will
    // stick to returning properties with the units the way we specified them
    // in css, but after they have been opened once they will stick to pixels
    modalElement.showModal();

    // animation tick
    let timeInterval = 10;
    // element's children
    let children = Array.from(modalElement.children);
    // gets computed size of the element, since its been opened already, units will be px
    let temp = window.getComputedStyle(modalElement).width;
    let modalOriginalWidth = parseInt(temp.slice(0, temp.length - 2));
    temp = window.getComputedStyle(modalElement).height;
    let modalOriginalHeight = parseInt(temp.slice(0, temp.length - 2));

    let modalCurrWidth = dir == 1 ? 0 : modalOriginalWidth;
    let modalCurrHeight = dir == 1 ? 0 : modalOriginalHeight;
    let modalTargetWidth = dir == 1 ? modalOriginalWidth : 0;
    let modalTargetHeight = dir == 1 ? modalOriginalHeight : 0;

    // how much should the size change by each tick
    let widthIncrement = modalOriginalWidth / popTime * timeInterval;
    let heightIncrement = modalOriginalHeight / popTime * timeInterval;

    // save children original opacity and set its start and target values
    let targetOpacity = [];
    let originalOpacity = [];
    children.forEach((element) => {

        originalOpacity.push(window.getComputedStyle(element).opacity);

        if(dir > 0) {

            targetOpacity.push(parseFloat(originalOpacity[originalOpacity.length - 1]));
            element.style.opacity = 0;
            return;
        }
        targetOpacity.push(0);
    });
    
    // timeout for pop, happens first if opening, second if closing
    setTimeout(() => {

        // children fade in/out animation
        let fadeAnimation = setInterval(() => {

            children.forEach((element, index) => {

                let opacityIncrement = originalOpacity[index] / fadeTime * timeInterval;

                element.style.opacity = parseFloat(window.getComputedStyle(element).opacity) + (opacityIncrement * dir);
            });

            let complete = children.every((element, index) => {
                // im really proud of this one below rhere: look at it boi look at it
                return (targetOpacity[index] + (parseFloat(element.style.opacity) * -dir) <= 0);
            });

            if(complete) {

                // enable all interactible elements back
                interactibles.forEach((element) => {
                    element.disabled = false;
                });

                // note on not deleting in-line style values for the children:
                // in this case we dont do that because its just avalue from 0
                // to 1, there is no conflict like % and px as with the modal.
                // So even if we resize the screen and trigger @media queries
                // all will be fine

                clearTimeout(fadeAnimation);
            }

        }, timeInterval);

    }, dir > 0 ? popTime : 0);

    // timeout for pop, happens first if closing, second if opening
    setTimeout(() => {

        
        // modal pop in/out animation
        let popAnimation = setInterval(()=>{
            
            modalCurrWidth += widthIncrement * dir;
            modalCurrHeight += heightIncrement * dir;
            
            modalElement.style.width = `${modalCurrWidth}px`;
            modalElement.style.height = `${modalCurrHeight}px`;

            // we set this here to avoid seen it full dimensions for a tick or two
            modalElement.style.opacity = 1;
            
            // im really proud of this one below rhere: look at it boi look at it
            if(modalTargetWidth + (modalCurrWidth * -dir) <= 0) {

                modalElement.style.width = `${modalTargetWidth}px`;
                modalElement.style.height = `${modalTargetHeight}px`;
                
                // if we meant to close the modal:
                if(dir < 0) {
                    modalElement.close();
                    
                    modalElement.style.height = `${modalOriginalHeight}px`;
                    modalElement.style.width = `${modalOriginalWidth}px`;
                    
                    
                    children.forEach((element, index) => {
                        element.style.opacity = originalOpacity[index];
                    });
                }

                // we let css values take over again to avoid a display conflict if
                // the user changes the aspect ratio (% and px)
                modalElement.removeAttribute('style');

                // if the modal is done popping out and we want to delete it
                if(delOnFinish && dir == -1) {
                    document.body.removeChild(modalElement);
                }

                clearInterval(popAnimation);
            }

        }, timeInterval);

    }, dir > 0 ? 0 : fadeTime);
}

// backdrop fade animation
function backdropFade(dir, duration) {

    // if we are calling a fade in/out on a modal that is already in/out, then return
    if((backdropState == 1 && messagesCounter > 0) ||
        backdropState == 0 && messagesCounter == 0) {
        return;
    }

    // set backdrop state
    backdropState = dir;

    // while backdrop fade is in progress, we direct all pointer events to it
    backdropElement.style.pointerEvents = 'auto';

    // update tick
    let timeInterval = 10;
    let opacityIncrement = 1.0 / duration * timeInterval;
    let opacityTarget = backdropElement.style.opacity == 0 ? 1.0 : 0.0;

    let fadeAnimation = setInterval(() => {

        // every tick, we mod the opaciy
        backdropElement.style.opacity = parseFloat(window.getComputedStyle(backdropElement).opacity) + (opacityIncrement * dir);

        duration -= timeInterval;

        if(duration <= 0) {

            backdropElement.style.opacity = opacityTarget * dir;
            
            // if backdrop faded out, let pointer events go trough
            backdropElement.style.pointerEvents = dir > 0 ? 'auto' : 'none';
            clearInterval(fadeAnimation);
        }
        
    }, timeInterval);
}