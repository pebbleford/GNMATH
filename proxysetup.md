# Proxy setup instructions (for Claude in Chrome)

Hand this file to Claude in Chrome. It sets up the Ultraviolet web proxy on the user's own Oracle Cloud VM, using only the browser.

## Goal

Run the open-source [Ultraviolet-App](https://github.com/titaniumnetwork-dev/Ultraviolet-App) web proxy in Docker on the user's existing Oracle Cloud Ubuntu VM, so the user can reach it from a browser. Use DuckDuckGo as its search engine, because Google shows a robot check for proxied traffic.

## Rules (read first)

- Work only with the user's own Oracle Cloud account and VM. Do not create new paid resources, and never enter payment details.
- If you hit a login, 2FA, captcha or SSH key prompt, **stop and ask the user**. Do not guess or try to bypass it.
- Never ask for, copy or paste the user's password or private key into any chat. The user uploads or selects their own key.
- Before changing any firewall or network rule, show the user the exact rule and wait for a yes.
- Do not open any port to the whole internet (`0.0.0.0/0`) unless the user explicitly says to. Prefer the user's own public IP.
- This kind of proxy can get around school or work web filters. Remind the user to use it only where their network's rules allow it.
- If a step fails, show the user the exact error text and stop. Do not retry blindly.

## What you need from the user

1. They are logged in to `cloud.oracle.com`.
2. The name of the VM (Compute, Instances) to use, and confirmation that it runs Ubuntu.
3. Their SSH private key file. Cloud Shell needs it to log in to the VM, and the user has to upload it themselves.

## Steps

### 1. Open Cloud Shell
In the Oracle console, click the terminal icon (`>_`) at the top right. Wait for the shell to start.

### 2. Log in to the VM
Ask the user to upload their key with Cloud Shell's upload option (gear or menu icon). Then run, replacing the names:
```sh
chmod 600 <keyfile>
ssh -i <keyfile> ubuntu@<vm-public-ip>
```
The public IP is on the instance's details page. Type `yes` if it asks about the fingerprint. The prompt should change to `ubuntu@...`.

### 3. Install Docker if it is missing
```sh
docker --version || (sudo apt-get update && sudo apt-get install -y docker.io git)
sudo systemctl enable --now docker
```

### 4. Get and build the proxy
```sh
git clone --depth 1 https://github.com/titaniumnetwork-dev/Ultraviolet-App ~/ultraviolet-app
cd ~/ultraviolet-app
sed -i 's#https://www.google.com/search?q=%s#https://duckduckgo.com/?q=%s#' public/index.html
grep -n "duckduckgo" public/index.html
sudo docker build -t ultraviolet-app .
```
The `grep` should print one line. The build can take several minutes. If it errors, show the user the last 20 lines.

### 5. Run it
```sh
sudo docker rm -f ultraviolet-app 2>/dev/null
sudo docker run -d --name ultraviolet-app --restart unless-stopped -p 8080:8080 ultraviolet-app
sudo docker ps
```
`docker ps` should show `ultraviolet-app` with `0.0.0.0:8080->8080/tcp`.

### 6. Open the port (ask the user first)
Oracle blocks ports in two places. Show the user each change before making it.

a. **In the Oracle console:** open the instance, then its subnet, then its **Security List** (or Network Security Group). Add an **Ingress Rule**:
   - Source CIDR: the user's own public IP followed by `/32` (ask the user for it, or have them look it up). Use `0.0.0.0/0` only if the user explicitly says so.
   - IP protocol: TCP
   - Destination port: 8080

b. **On the VM:**
```sh
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### 7. HTTPS (needed for the proxy to work properly)
Ultraviolet uses service workers, which browsers only allow on HTTPS pages or on `localhost`. Plain `http://<vm-ip>:8080` will most likely not work.

**Stop here and ask the user how they want to get HTTPS.** Do not set up any tunnel or public exposure yourself. Common choices are a domain with a certificate in front of the proxy, or running the proxy on their own PC (where `http://localhost:8080` works) instead of the VM. Only continue once the user has chosen and told you exactly what to do.

### 8. Check it works
Open the HTTPS address the user chose in step 7 in Chrome or Edge. Type `duckduckgo.com` or a search term in the box. A page should load. If the browser says the service worker failed or the page is blank, the usual cause is that the address is not HTTPS.

## Report back to the user
Say plainly what worked and what did not. Include:
- the address to use,
- the commands to stop and start it: `sudo docker stop ultraviolet-app` and `sudo docker start ultraviolet-app`,
- anything that failed, with the exact error text.

## Notes
- Ultraviolet-App is licensed GPL-3.0, and its authors no longer maintain it (they point to Scramjet).
- This is a separate program from Fern proxy, which is a PostgreSQL data-masking proxy and cannot proxy websites.
- None of these steps have been run by the author of this file. Expect to troubleshoot.
