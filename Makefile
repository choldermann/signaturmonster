.PHONY: up down restart logs build clean

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build --no-cache

clean:
	docker compose down -v
	rm -rf data/signaturmonster.db

status:
	docker compose ps

smtp-logs:
	docker compose logs -f smtp-proxy

backend-logs:
	docker compose logs -f backend
