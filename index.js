'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };

    var mql = window.matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();

    if (mql.addEventListener) {
      mql.addEventListener('change', setMode);
    } else if (mql.addListener) {
      mql.addListener(setMode);
    }
  } else {
    document.body.classList.add('desktop');
  }

  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  }, { passive: true });

  if (bowser && bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  var scenes = data.scenes.map(function(sceneData) {
    var urlPrefix = 'tiles';

    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + '/' + sceneData.id + '/{z}/{f}/{y}/{x}.jpg',
      { cubeMapPreviewUrl: urlPrefix + '/' + sceneData.id + '/preview.jpg' }
    );

    var geometry = new Marzipano.CubeGeometry(sceneData.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize,
      100 * Math.PI / 180,
      120 * Math.PI / 180
    );

    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    (sceneData.linkHotspots || []).forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, {
        yaw: hotspot.yaw,
        pitch: hotspot.pitch
      });
    });

    (sceneData.infoHotspots || []).forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, {
        yaw: hotspot.yaw,
        pitch: hotspot.pitch
      });
    });

    (sceneData.dronHotspots || []).forEach(function(hotspot) {
      var element = createDronHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, {
        yaw: hotspot.yaw,
        pitch: hotspot.pitch
      });
    });

    (sceneData.webHotspots || []).forEach(function(hotspot) {
      var element = createWeblupaHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, {
        yaw: hotspot.yaw,
        pitch: hotspot.pitch
      });
    });

    (sceneData.pinHotspots || []).forEach(function(hotspot) {
      var element = createPinHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, {
        yaw: hotspot.yaw,
        pitch: hotspot.pitch
      });
    });

    (sceneData.imageHotspots || []).forEach(function(hotspot) {
  var element = createImageHotspotElement(hotspot);
  scene.hotspotContainer().createHotspot(element, {
    yaw: hotspot.yaw,
    pitch: hotspot.pitch
  });
});

    return {
      data: sceneData,
      scene: scene,
      view: view
    };
  });

  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI / 2
  });

  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  if (screenfull && screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');

    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });

    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  sceneListToggleElement.addEventListener('click', toggleSceneList);

  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  Array.prototype.forEach.call(sceneElements, function(element) {
    element.addEventListener('click', function() {
      var id = element.getAttribute('data-id');
      var scene = findSceneById(id);

      if (scene) {
        switchScene(scene);
        if (document.body.classList.contains('mobile')) {
          hideSceneList();
        }
      }
    });
  });

  if (scenes.length > 0) {
    switchScene(scenes[0]);
  }

  function sanitize(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    var rotation = hotspot.rotation || 0;
    var transformProperties = ['-ms-transform', '-webkit-transform', 'transform'];
    for (var i = 0; i < transformProperties.length; i++) {
      icon.style[transformProperties[i]] = 'rotate(' + rotation + 'rad)';
    }

    wrapper.addEventListener('click', function() {
      var targetScene = findSceneById(hotspot.target);
      if (targetScene) {
        switchScene(targetScene);
      }
    });

    stopTouchAndScrollEventPropagation(wrapper);

    var textBox = document.createElement('div');
    textBox.classList.add('link-hotspot-textbox');

    var targetData = findSceneDataById(hotspot.target);
    textBox.textContent = hotspot.title || (targetData ? targetData.name : '');

    wrapper.appendChild(icon);
    wrapper.appendChild(textBox);

    return wrapper;
  }

  function createDronHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('dron-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/dron.png';
    icon.classList.add('dron-hotspot-icon');

    var rotation = hotspot.rotation || 0;
    var transformProperties = ['-ms-transform', '-webkit-transform', 'transform'];
    for (var i = 0; i < transformProperties.length; i++) {
      icon.style[transformProperties[i]] = 'rotate(' + rotation + 'rad)';
    }

    wrapper.addEventListener('click', function() {
      var targetScene = findSceneById(hotspot.target);
      if (targetScene) {
        switchScene(targetScene);
      }
    });

    stopTouchAndScrollEventPropagation(wrapper);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('dron-hotspot-tooltip');

    var targetData = findSceneDataById(hotspot.target);
    tooltip.innerHTML = targetData ? targetData.name : '';

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');

    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');

    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title || '';
    titleWrapper.appendChild(title);

    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');

    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text || '';

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function createWeblupaHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('web-hotspot');

    var header = document.createElement('a');
    header.classList.add('web-hotspot-header');
    header.href = hotspot.url;
    header.target = '_blank';
    header.rel = 'noopener noreferrer';
    header.title = hotspot.title || 'Open website';

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('web-hotspot-icon-wrapper');

    var icon = document.createElement('img');
    icon.src = 'img/lupa.png';
    icon.classList.add('web-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('web-hotspot-title-wrapper');

    var title = document.createElement('div');
    title.classList.add('web-hotspot-title');
    title.innerHTML = hotspot.title || '';
    titleWrapper.appendChild(title);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    wrapper.appendChild(header);

    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function createPinHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('pin-hotspot');

    var header = document.createElement('a');
    header.classList.add('pin-hotspot-header');
    header.href = hotspot.url;
    header.target = '_blank';
    header.rel = 'noopener noreferrer';
    header.title = hotspot.title || 'Open website';

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('pin-hotspot-icon-wrapper');

    var icon = document.createElement('img');
    icon.src = 'img/pin.png';
    icon.classList.add('pin-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('pin-hotspot-title-wrapper');

    var title = document.createElement('div');
    title.classList.add('pin-hotspot-title');
    title.innerHTML = hotspot.title || '';
    titleWrapper.appendChild(title);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    wrapper.appendChild(header);

    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

 function createImageHotspotElement(hotspot) {
  var wrapper = document.createElement('div');
  wrapper.classList.add('hotspot');
  wrapper.classList.add('image-hotspot');

  var button = document.createElement('div');
  button.classList.add('image-hotspot-button');

  var icon = document.createElement('img');
  icon.src = hotspot.icon || 'img/image.png';
  icon.classList.add('image-hotspot-icon');

  var title = document.createElement('div');
  title.classList.add('image-hotspot-title');
  title.textContent = hotspot.title || '';

  button.appendChild(icon);
  button.appendChild(title);
  wrapper.appendChild(button);

  var modal = document.createElement('div');
  modal.classList.add('image-hotspot-modal');

  var modalContent = document.createElement('div');
  modalContent.classList.add('image-hotspot-modal-content');

  var close = document.createElement('div');
  close.classList.add('image-hotspot-close');
  close.innerHTML = '&times;';

  var modalTitle = document.createElement('div');
  modalTitle.classList.add('image-hotspot-popup-title');
  modalTitle.textContent = hotspot.title || '';

  var image = document.createElement('img');
  image.classList.add('image-hotspot-popup-image');
  image.src = hotspot.image;
  image.alt = hotspot.title || 'Image';

  modalContent.appendChild(close);
  modalContent.appendChild(modalTitle);
  modalContent.appendChild(image);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  function openModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    modal.classList.add('visible');
  }

  function closeModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    modal.classList.remove('visible');
  }

  button.addEventListener('click', openModal);
  button.addEventListener('touchstart', openModal, { passive: false });

  close.addEventListener('click', closeModal);
  close.addEventListener('touchstart', closeModal, { passive: false });

  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal(event);
    }
  });

  stopTouchAndScrollEventPropagation(wrapper);

  return wrapper;
}
  
  
  function stopTouchAndScrollEventPropagation(element) {
    var eventList = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }
})();