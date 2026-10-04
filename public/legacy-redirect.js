// Redireciona o domínio antigo (.lovable.app) para o domínio oficial (.com.br)
(function () {
  var h = location.hostname;
  if (h === "cadernodooga.lovable.app" || h === "www.cadernodooga.lovable.app") {
    location.replace("https://cadernodooga.com.br" + location.pathname + location.search + location.hash);
  }
})();
