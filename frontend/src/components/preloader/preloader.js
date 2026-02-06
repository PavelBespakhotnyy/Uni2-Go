function initPreloader() {
  const preloader = document.getElementById('preloader');
  const style = document.getElementById('main-style');

  if (!preloader || !style) return;

  const hidePreloader = () => {
    preloader.style.display = 'none';
  };

  if (style.sheet) hidePreloader();
  else {
    style.addEventListener('load', hidePreloader, { once: true });
    style.addEventListener('error', hidePreloader, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', initPreloader);
