FROM mysql:8.4
# Les scripts de ce dossier ne s'exécutent qu'à la première création du volume (base vide)
COPY init/ /docker-entrypoint-initdb.d/
COPY my.cnf /etc/mysql/conf.d/kozz.cnf
