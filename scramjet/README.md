# Scramjet (second proxy engine)

[Scramjet](https://github.com/MercuryWorkshop/scramjet) is a newer web proxy from Mercury Workshop, and it's meant to handle more sites than Ultraviolet. It runs as its own server, so it's a **separate container on its own port** (8081). It can't share a container or a service worker with Ultraviolet.

The **Proxy** start page has an engine picker: **Ultraviolet** (this page, port 8080) or **Scramjet** (port 8081). Choosing Scramjet opens its own page in a new browser tab.

**Not tested here.** The build and the proxy haven't been run on the VM.

## Install on the Oracle VM (same VM as Ultraviolet)

In Cloud Shell, logged in to the VM:

```sh
cd ~
git clone https://github.com/pebbleford/gnmath.git 2>/dev/null || git -C ~/gnmath pull --ff-only
cd ~/gnmath/scramjet
sudo docker build -t scramjet-app .
sudo docker rm -f scramjet-app 2>/dev/null
sudo docker run -d --name scramjet-app --restart unless-stopped -p 8081:8080 scramjet-app
sudo docker ps
```

Then open the port in both places, as you did for 8080:
- Oracle **Security List**: add an ingress rule for TCP **8081**.
- On the VM: `sudo iptables -I INPUT -p tcp --dport 8081 -j ACCEPT` and `sudo netfilter-persistent save`.

## Notes

- **HTTPS:** like Ultraviolet, Scramjet needs HTTPS to work outside `localhost`. An `http://<ip>:8081` address may load but fail in the proxy.
- **Datacenter IPs:** the upstream project says CAPTCHAs and some sites work less reliably from a cloud server IP.
- **GeForce NOW:** the upstream README lists it as supported, but a game stream is a live video connection. Test it before relying on it.
- **Licence:** Scramjet is AGPL-3.0. Running it for other people means you must offer them its source.
