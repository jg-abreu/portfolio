# Deploy and infrastructure

How joaoabreu.dev is served, and how to rebuild the server from scratch.

```
visitor ──HTTPS──▶ Cloudflare (proxy, cache, edge certificate)
                       │  HTTPS, SSL mode Full (strict)
                       ▼
                 AWS Lightsail · Ubuntu 24.04 · nginx
                 /var/www/portfolio  ◀── rsync over SSH (user deploy) from GitHub Actions (stage 3)
```

| Piece | Where | Notes |
|---|---|---|
| Server | AWS Lightsail, instance `portfolio`, us-east-2 (Ohio) | $5 plan: 512 MB, 2 vCPU, 20 GB SSD, 1 TB transfer, dual-stack |
| Address | Static IP `portfolio-ip` attached to the instance | Free while attached; billed if left detached |
| Firewall | Lightsail networking tab | 22 (SSH), 80 (HTTP), 443 (HTTPS), any IPv4/IPv6 |
| DNS | Cloudflare | `A @` → static IP, `CNAME www` → `joaoabreu.dev`, both proxied |
| TLS | Cloudflare Origin CA certificate on nginx | `/etc/ssl/cloudflare/joaoabreu.dev.{pem,key}`, valid until 2041 |
| Web server | [`nginx/portfolio.conf`](nginx/portfolio.conf) | `/etc/nginx/sites-available/portfolio` |

The origin IP is not written here on purpose: with the proxy on, it stays hidden behind Cloudflare.

## Accounts and costs

- **AWS Free plan** until **2027-04-21** (US$ 100 in credits). The instance costs about US$ 5/month, paid by the credits. Before that date, either upgrade to the Paid plan and set a **spend limit** (minimum US$ 20), or move the site elsewhere. Without the upgrade, AWS closes the account and the server with it.
- The AWS account uses the 2026 "projects" model: it is owned by an AWS Builder ID (sign-in through GitHub, MFA on the Builder ID). Do **not** choose "Activate advanced features": it is irreversible and not needed here.
- **Plan B:** Oracle Cloud (Always Free A1.Flex). The stack `portfolio-vm` is saved in Resource Manager and the quota policy `free-tier-only` blocks anything outside Always Free. It was never applied because A1 had no capacity.

## Rebuild the server

Run on your machine unless the step says *on the server*. `<ip>` is the static IP shown in Lightsail.

1. **Create the instance** in Lightsail: Linux operating system → Ubuntu 24.04 LTS, General purpose, Dual-stack, the $5 size, name `portfolio`, automatic snapshots off. Under *Advanced settings → SSH key*, upload your public key (`~/.ssh/<key>.pub`).
2. **Attach a static IP** (Networking tab) and **add a firewall rule** for HTTPS (443) from anywhere.
3. **Connect:** `ssh -i ~/.ssh/<key> ubuntu@<ip>`.
4. **Update and reboot** *on the server*:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo reboot
   ```
   Automatic security updates come enabled; check that both values are `"1"`:
   ```bash
   cat /etc/apt/apt.conf.d/20auto-upgrades
   ```
5. **Check that SSH is key-only** *on the server*; expect `passwordauthentication no`, `kbdinteractiveauthentication no`, `pubkeyauthentication yes`:
   ```bash
   sudo sshd -T | grep -Ei 'passwordauthentication|kbdinteractiveauthentication|permitrootlogin|pubkeyauthentication'
   ```
6. **Create the deploy user and its key.** On your machine, a key without a passphrase (GitHub Actions cannot type one; GitHub Secrets protects it):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/portfolio_deploy
   ```
   *On the server*, a user without sudo that only accepts that key:
   ```bash
   sudo adduser --disabled-password --gecos "" deploy
   sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
   echo '<contents of portfolio_deploy.pub>' | sudo tee /home/deploy/.ssh/authorized_keys
   sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
   sudo chmod 600 /home/deploy/.ssh/authorized_keys
   ```
   Test from your machine; it must print `deploy`:
   ```bash
   ssh -i ~/.ssh/portfolio_deploy deploy@<ip> whoami
   ```
7. **Install nginx and the site folder** *on the server*:
   ```bash
   sudo apt install -y nginx
   sudo install -d -m 755 -o deploy -g deploy /var/www/portfolio
   ```
8. **Install the Cloudflare Origin certificate.** In Cloudflare: *SSL/TLS → Origin Server → Create Certificate* (Cloudflare generates the key, ECC, hosts `joaoabreu.dev` and `*.joaoabreu.dev`, 15 years). The private key is shown only once: keep the page open until both files are saved. *On the server*:
   ```bash
   sudo install -d -m 700 /etc/ssl/cloudflare
   sudo nano /etc/ssl/cloudflare/joaoabreu.dev.pem   # paste the Origin Certificate
   sudo nano /etc/ssl/cloudflare/joaoabreu.dev.key   # paste the Private Key
   sudo chmod 600 /etc/ssl/cloudflare/joaoabreu.dev.key
   ```
   Both hashes must match:
   ```bash
   sudo openssl pkey -in /etc/ssl/cloudflare/joaoabreu.dev.key -pubout | sha256sum
   sudo openssl x509 -in /etc/ssl/cloudflare/joaoabreu.dev.pem -pubkey -noout | sha256sum
   ```
9. **Install the nginx site.** Copy the file with `scp` rather than pasting it into the terminal (long pastes get mangled):
   ```bash
   scp -i ~/.ssh/<key> deploy/nginx/portfolio.conf ubuntu@<ip>:/tmp/portfolio
   ```
   *On the server*:
   ```bash
   sudo install -m 644 /tmp/portfolio /etc/nginx/sites-available/portfolio
   sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```
10. **Point Cloudflare at the server:** DNS records `A @` → `<ip>` and `CNAME www` → `joaoabreu.dev`, both proxied. *SSL/TLS → Overview* → **Full (strict)**. *SSL/TLS → Edge Certificates* → **Always Use HTTPS** on.

## Check that it works

```bash
curl -sI https://joaoabreu.dev/        # 301, location: /en/, security headers
curl -sI http://joaoabreu.dev/en/      # 301 to https://joaoabreu.dev/en/
curl -sI https://joaoabreu.dev/nope    # 404 (the Astro 404 once the site is deployed)
```

## Changing the nginx config

Edit [`nginx/portfolio.conf`](nginx/portfolio.conf) here, then repeat step 9 (`scp`, `install`, `nginx -t && reload`). Always run `nginx -t` before reloading: a reload with a broken file is refused, but a restart would take the site down.
