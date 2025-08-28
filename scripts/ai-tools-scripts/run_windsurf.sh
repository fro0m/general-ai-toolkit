#!/bin/bash
export http_proxy="http://127.0.0.1:2080"
export https_proxy="http://127.0.0.1:2080"
export ALL_PROXY="socks5://127.0.0.1:2080"

/usr/share/windsurf/windsurf --proxy-server="http://127.0.0.1:2080" --proxy-bypass-list="*.coreops.ru,*.devos.club"
# proxychains4 /usr/share/windsurf/windsurf --no-sandbox --proxy-bypass-list="*.coreops.ru,*.devos.club"

#/usr/share/windsurf/windsurf
