function updateLangLinks() {

} 
document.addEventListener('appInit', function(event) {
    const app = event.detail;
    const locale = app.api.locale();
    console.log(locale);
})