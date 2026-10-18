try { document.documentElement.dataset.theme = localStorage.getItem("kozz_theme") === "dark" ? "dark" : "light"; } catch (e) { document.documentElement.dataset.theme = "light"; }
