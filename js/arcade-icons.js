/**
 * Replace Material Symbols icon-font spans with local SVG sprite references.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  /* AUTO-GENERATED_SPRITE_START */
  const INLINE_SPRITE = `<symbol id="add_circle" viewBox="0 -960 960 960">
      <path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
  </symbol>
  <symbol id="analytics" viewBox="0 -960 960 960">
      <path d="M280-280h80v-200h-80v200Zm320 0h80v-400h-80v400Zm-160 0h80v-120h-80v120Zm0-200h80v-80h-80v80ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
  </symbol>
  <symbol id="arrow_back" viewBox="0 -960 960 960">
      <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
  </symbol>
  <symbol id="bolt" viewBox="0 -960 960 960">
      <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z"/>
  </symbol>
  <symbol id="check" viewBox="0 -960 960 960">
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
  </symbol>
  <symbol id="close" viewBox="0 -960 960 960">
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
  </symbol>
  <symbol id="fast_forward" viewBox="0 -960 960 960">
      <path d="M100-240v-480l360 240-360 240Zm400 0v-480l360 240-360 240ZM180-480Zm400 0Zm-400 90 136-90-136-90v180Zm400 0 136-90-136-90v180Z"/>
  </symbol>
  <symbol id="grid_view" viewBox="0 -960 960 960">
      <path d="M120-520v-320h320v320H120Zm0 400v-320h320v320H120Zm400-400v-320h320v320H520Zm0 400v-320h320v320H520ZM200-600h160v-160H200v160Zm400 0h160v-160H600v160Zm0 400h160v-160H600v160Zm-400 0h160v-160H200v160Zm400-400Zm0 240Zm-240 0Zm0-240Z"/>
  </symbol>
  <symbol id="local_mall" viewBox="0 -960 960 960">
      <path d="M200-80q-33 0-56.5-23.5T120-160v-480q0-33 23.5-56.5T200-720h80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720h80q33 0 56.5 23.5T840-640v480q0 33-23.5 56.5T760-80H200Zm0-80h560v-480H200v480Zm421.5-298.5Q680-517 680-600h-80q0 50-35 85t-85 35q-50 0-85-35t-35-85h-80q0 83 58.5 141.5T480-400q83 0 141.5-58.5ZM360-720h240q0-50-35-85t-85-35q-50 0-85 35t-35 85ZM200-160v-480 480Z"/>
  </symbol>
  <symbol id="lock" viewBox="0 -960 960 960">
      <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm296.5-143.5Q560-327 560-360t-23.5-56.5Q513-440 480-440t-56.5 23.5Q400-393 400-360t23.5 56.5Q447-280 480-280t56.5-23.5ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/>
  </symbol>
  <symbol id="menu_book" viewBox="0 -960 960 960">
      <path d="M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z"/>
  </symbol>
  <symbol id="monetization_on" viewBox="0 -960 960 960">
      <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Zm36 120q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
  </symbol>
  <symbol id="paid" viewBox="0 -960 960 960">
      <path d="M444-200h70v-50q50-9 86-39t36-89q0-42-24-77t-96-61q-60-20-83-35t-23-41q0-26 18.5-41t53.5-15q32 0 50 15.5t26 38.5l64-26q-11-35-40.5-61T516-710v-50h-70v50q-50 11-78 44t-28 74q0 47 27.5 76t86.5 50q63 23 87.5 41t24.5 47q0 33-23.5 48.5T486-314q-33 0-58.5-20.5T390-396l-66 26q14 48 43.5 77.5T444-252v52Zm36 120q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
  </symbol>
  <symbol id="person" viewBox="0 -960 960 960">
      <path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z"/>
  </symbol>
  <symbol id="play_arrow" viewBox="0 -960 960 960">
      <path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/>
  </symbol>
  <symbol id="policy" viewBox="0 -960 960 960">
      <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 85-29 163.5T688-214L560-342q-18 11-38.5 16.5T480-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 22-5.5 42.5T618-398l60 60q20-41 31-86t11-92v-189l-240-90-240 90v189q0 121 68 220t172 132q26-8 49.5-20.5T576-214l56 56q-33 27-71.5 47T480-80Zm56.5-343.5Q560-447 560-480t-23.5-56.5Q513-560 480-560t-56.5 23.5Q400-513 400-480t23.5 56.5Q447-400 480-400t56.5-23.5ZM488-477Z"/>
  </symbol>
  <symbol id="refresh" viewBox="0 -960 960 960">
      <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
  </symbol>
  <symbol id="shuffle" viewBox="0 -960 960 960">
      <path d="M560-160v-80h104L537-367l57-57 126 126v-102h80v240H560Zm-344 0-56-56 504-504H560v-80h240v240h-80v-104L216-160Zm151-377L160-744l56-56 207 207-56 56Z"/>
  </symbol>
  <symbol id="skip_next" viewBox="0 -960 960 960">
      <path d="M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Zm80-240Zm0 90 136-90-136-90v180Z"/>
  </symbol>
  <symbol id="sports_esports" viewBox="0 -960 960 960">
      <path d="M182-200q-51 0-79-35.5T82-322l42-300q9-60 53.5-99T282-760h396q60 0 104.5 39t53.5 99l42 300q7 51-21 86.5T778-200q-21 0-39-7.5T706-230l-90-90H344l-90 90q-15 15-33 22.5t-39 7.5Zm16-86 114-114h336l114 114q2 2 16 6 11 0 17.5-6.5T800-304l-44-308q-4-29-26-48.5T678-680H282q-30 0-52 19.5T204-612l-44 308q-2 11 4.5 17.5T182-280q2 0 16-6Zm510.5-165.5Q720-463 720-480t-11.5-28.5Q697-520 680-520t-28.5 11.5Q640-497 640-480t11.5 28.5Q663-440 680-440t28.5-11.5Zm-80-120Q640-583 640-600t-11.5-28.5Q617-640 600-640t-28.5 11.5Q560-617 560-600t11.5 28.5Q583-560 600-560t28.5-11.5ZM310-440h60v-70h70v-60h-70v-70h-60v70h-70v60h70v70Zm170-40Z"/>
  </symbol>
  <symbol id="upgrade" viewBox="0 -960 960 960">
      <path d="M280-160v-80h400v80H280Zm160-160v-327L336-544l-56-56 200-200 200 200-56 56-104-103v327h-80Z"/>
  </symbol>
  <symbol id="videogame_asset" viewBox="0 -960 960 960">
      <path d="M160-240q-33 0-56.5-23.5T80-320v-320q0-33 23.5-56.5T160-720h640q33 0 56.5 23.5T880-640v320q0 33-23.5 56.5T800-240H160Zm0-80h640v-320H160v320Zm120-40h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80Zm342.5-17.5Q640-395 640-420t-17.5-42.5Q605-480 580-480t-42.5 17.5Q520-445 520-420t17.5 42.5Q555-360 580-360t42.5-17.5Zm120-120Q760-515 760-540t-17.5-42.5Q725-600 700-600t-42.5 17.5Q640-565 640-540t17.5 42.5Q675-480 700-480t42.5-17.5ZM160-320v-320 320Z"/>
  </symbol>
  <symbol id="volume_off" viewBox="0 -960 960 960">
      <path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Zm-80 238v-94l-72-72H200v80h114l86 86Zm-36-130Z"/>
  </symbol>
  <symbol id="volume_up" viewBox="0 -960 960 960">
      <path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/>
  </symbol>`;
  /* AUTO-GENERATED_SPRITE_END */

  function spriteBase() {
    const pathname = location.pathname || '';
    return pathname.includes('/games/') ? '../../icons/sprite.svg' : 'icons/sprite.svg';
  }

  function ensureInlineSprite() {
    if (!INLINE_SPRITE || document.getElementById('arcade-icon-sprite')) return;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'arcade-icon-sprite';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const tmp = document.createElementNS(SVG_NS, 'svg');
    tmp.innerHTML = INLINE_SPRITE;
    while (tmp.firstChild) svg.appendChild(tmp.firstChild);
    const parent = document.body || document.documentElement;
    parent.insertBefore(svg, parent.firstChild);
  }

  function iconHref(name) {
    if (document.getElementById('arcade-icon-sprite')) return `#${name}`;
    return `${spriteBase()}#${name}`;
  }

  function iconNameFromEl(el) {
    if (el.dataset && el.dataset.icon) return el.dataset.icon.trim();
    return (el.textContent || '').trim();
  }

  function setIcon(el, name) {
    if (!el || !name) return;
    const href = iconHref(name);

    el.classList.remove('material-symbols-outlined', 'filled');
    el.classList.add('arcade-icon');
    el.dataset.icon = name;
    el.textContent = '';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', href);
    use.setAttributeNS(XLINK_NS, 'xlink:href', href);

    svg.appendChild(use);
    el.appendChild(svg);
  }

  function hydrate(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.material-symbols-outlined').forEach((el) => {
      const name = iconNameFromEl(el);
      if (name) setIcon(el, name);
    });
  }

  function startObserver() {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('.material-symbols-outlined')) {
            const name = iconNameFromEl(node);
            if (name) setIcon(node, name);
            return;
          }
          if (node.querySelectorAll) hydrate(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.ArcadeIcons = {
    hydrate,
    setIcon,
    spriteBase,
    ensureInlineSprite,
  };

  function boot() {
    if (location.protocol === 'file:') ensureInlineSprite();
    hydrate();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
