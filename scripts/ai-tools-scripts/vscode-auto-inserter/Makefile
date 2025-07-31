.PHONY: install run install-service start-service stop-service status

install:
	poetry install

run:
	poetry run python auto-inserter/main.py

install-service:
	./install_service.sh

start-service:
	systemctl --user start auto-inserter.service

stop-service:
	systemctl --user stop auto-inserter.service

status:
	systemctl --user status auto-inserter.service

uninstall-service:
	systemctl --user stop auto-inserter.service || true
	systemctl --user disable auto-inserter.service || true
	rm -f ~/.config/systemd/user/auto-inserter.service
	systemctl --user daemon-reload
