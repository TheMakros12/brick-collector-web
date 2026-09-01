(function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initialTheme);

    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon and text label
        const themeIcon = document.getElementById('theme-icon');
        const themeSpan = document.querySelector('.theme-toggle-btn-full span');
        if (themeIcon && window.lucide) {
            themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
            window.lucide.createIcons();
        }
        if (themeSpan) {
            themeSpan.textContent = newTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
        }
        
        // Notify other parts of the app
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
    };

    // Listen for OS theme changes if user hasn't explicitly set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            
            const themeIcon = document.getElementById('theme-icon');
            if (themeIcon && window.lucide) {
                themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
                window.lucide.createIcons();
            }
        }
    });
})();
