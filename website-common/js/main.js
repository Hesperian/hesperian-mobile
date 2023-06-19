window.isWebsite = true;

function updateLangLinks(event) {
  const app = event.detail;
  const locale = app.api.locale();
  const langs = [
    ...document.querySelectorAll(".app-header-languages .choose-language"),
  ];
  langs.forEach((l) => {
    const lc = l.dataset.lang;
    if (locale === lc) {
      l.setAttribute("disabled", true);
    } else {
      l.removeAttribute("disabled");
    }
  });
}
document.addEventListener("appInit", updateLangLinks);
document.addEventListener("appConfigChanged", updateLangLinks);
