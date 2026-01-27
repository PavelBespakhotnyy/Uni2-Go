window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');

    setTimeout(() => {
        if (preloader) preloader.style.display = 'none';
    }, 0); // <- Can change timeout
});
