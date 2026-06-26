/**
 * Promise-based modal dialog for the hub economy UI.
 */
(function () {
  'use strict';

  class ArcadeModal {
    show({ title, text, showCancel = false }) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('arcadeModal');
        const titleEl = document.getElementById('arcadeModalTitle');
        const textEl = document.getElementById('arcadeModalText');
        const okBtn = document.getElementById('arcadeModalOk');
        const cancelBtn = document.getElementById('arcadeModalCancel');

        if (!overlay || !titleEl || !textEl || !okBtn || !cancelBtn) {
          resolve(showCancel ? false : true);
          return;
        }

        titleEl.textContent = title || 'ARCADE HUB';
        textEl.textContent = text || '';
        cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';
        overlay.classList.remove('hidden');
        document.body.classList.add('modal-open');

        const dismissValue = showCancel ? false : true;

        const close = (value) => {
          overlay.classList.add('hidden');
          document.body.classList.remove('modal-open');
          okBtn.removeEventListener('click', okHandler);
          cancelBtn.removeEventListener('click', cancelHandler);
          overlay.removeEventListener('click', overlayHandler);
          document.removeEventListener('keydown', keyHandler);
          resolve(value);
        };

        const okHandler = () => close(true);
        const cancelHandler = () => close(false);
        const overlayHandler = (event) => {
          if (event.target === overlay) close(dismissValue);
        };
        const keyHandler = (event) => {
          if (event.key === 'Escape') close(dismissValue);
        };

        okBtn.addEventListener('click', okHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        overlay.addEventListener('click', overlayHandler);
        document.addEventListener('keydown', keyHandler);
      });
    }

    showInfo(title, text) {
      return this.show({ title, text, showCancel: false });
    }

    showConfirm(title, text) {
      return this.show({ title, text, showCancel: true });
    }
  }

  window.ArcadeModal = ArcadeModal;
})();
