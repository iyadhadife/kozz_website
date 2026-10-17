import os

from sqlalchemy import create_engine

_url = "mysql+pymysql://{u}:{p}@{h}:{port}/{d}?charset=utf8mb4".format(
    u=os.environ["MYSQL_USER"],
    p=os.environ["MYSQL_PASSWORD"],
    h=os.getenv("DB_HOST", "db"),
    port=os.getenv("DB_PORT", "3306"),
    d=os.environ["MYSQL_DATABASE"],
)

# pool_pre_ping : reconnecte tout seul si MySQL a redémarré
engine = create_engine(_url, pool_pre_ping=True, pool_recycle=1800)
