(function(){
  'use strict';const H=window.HL;
  try{H.initExplore();H.initSpectrum();H.initPractice();H.initMath();H.initExploreSpectrum();H.initLayout();H.initApp();}
  catch(e){console.error(e);const banner=document.createElement('div');banner.className='callout';banner.textContent='The app could not finish loading: '+e.message;document.querySelector('main').prepend(banner);}
})();
