// Добавить класс для управления производительностью
class PerformanceManager {
    constructor() {
        this.metrics = {};
    }

    // Измерение времени загрузки
    measureLoadTime() {
        const timing = window.performance.timing;
        return timing.loadEventEnd - timing.navigationStart;
    }

    // Ленивая загрузка изображений
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    imageObserver.unobserve(img);
                }
            });
        });
        images.forEach(img => imageObserver.observe(img));
    }
} 