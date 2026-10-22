# Deploy and infrastructure

How joaoabreu.dev is served, and how to rebuild the server from scratch.

```
visitor ──HTTPS──▶ Cloudflare (proxy, cache, edge certificate)
                       │  HTTPS, SSL mode Full (strict)
                       ▼
                 AWS Lightsail · Ubuntu 24.04 · nginx
                 /var/www/portfolio  ◀── rsync over SSH (user deploy) from GitHub Actions
```

| Piece | Where | Notes |
|---|---|---|
| Server | AWS Lightsail, instance `portfolio`, us-east-2 (Ohio) | $5 plan: 512 MB, 2 vCPU, 20 GB SSD, 1 TB transfer, dual-stack |
| Address | Static IP `portfolio-ip` attached to the instance | Free while attached; billed if left detached |
| Firewall | Lightsail networking tab | 22 (SSH): any IPv4/IPv6 + browser SSH; 80/443: Cloudflare IPv4/IPv6 ranges only |
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

## Automatic deploys

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds the site and copies `dist/` with rsync on every push to `main`, every day at 06:00 (Rio) to refresh the GitHub snapshot, and on demand (*Actions → Deploy → Run workflow*). It needs three repository secrets (*Settings → Secrets and variables → Actions*):

| Secret | Value |
|---|---|
| `DEPLOY_SSH_KEY` | the private key `~/.ssh/portfolio_deploy` (step 6), whole file |
| `DEPLOY_HOST` | the static IP |
| `DEPLOY_KNOWN_HOSTS` | the server's `ssh-ed25519` line from `ssh-keygen -F <ip>`, after you have connected once and checked the fingerprint |

GitHub disables scheduled workflows after 60 days without activity in the repository; re-enable it in the Actions tab if the daily run stops.

## Check that it works

```bash
curl -sI https://joaoabreu.dev/        # 301, location: /en/, security headers
curl -sI http://joaoabreu.dev/en/      # 301 to https://joaoabreu.dev/en/
curl -sI https://joaoabreu.dev/nope    # 404 (the Astro 404 once the site is deployed)
```

## Changing the nginx config

Edit [`nginx/portfolio.conf`](nginx/portfolio.conf) here, then repeat step 9 (`scp`, `install`, `nginx -t && reload`). Always run `nginx -t` before reloading: a reload with a broken file is refused, but a restart would take the site down.

## HSTS rollout

The HTTPS server sends `Strict-Transport-Security: max-age=300` (five minutes), including redirects and error responses. Apply the config using step 9; deploying the static site alone does not update nginx.

Check the public responses after applying:

```bash
curl -sI https://joaoabreu.dev/
curl -sI https://joaoabreu.dev/en/
curl -sI https://joaoabreu.dev/pt/
curl -sI https://joaoabreu.dev/hsts-check-not-found
```

Expect the header once on each response, with status 301, 200, 200 and 404 respectively. If Cloudflare serves an older cached response, purge the affected URL and repeat. Keep HSTS managed at the origin rather than enabling a second policy in Cloudflare.

After verifying HTTPS, increase `max-age` in a follow-up change (one day, then one year). This initial policy does not request `includeSubDomains` or `preload`. The `.dev` top-level domain is already preloaded by browsers; the short header does not undo that existing HTTPS requirement.

To withdraw the origin policy, serve `max-age=0` over HTTPS and apply the config again. Removing the header alone leaves previously received policies active until they expire; withdrawing this policy does not remove the `.dev` preload requirement.

References: [MDN HSTS header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security), [Cloudflare HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

## Origin firewall

Applied in Lightsail on 2026-10-22: HTTP (80) and HTTPS (443) each allow only the 15 IPv4 and 7 IPv6 CIDR ranges published by Cloudflare. Both unrestricted sources (`0.0.0.0/0` and `::/0`) were removed from these rules. SSH (22) was left unchanged for access and GitHub Actions deploys.

When rebuilding, replace the initial public web rules with the complete lists from [Cloudflare IPv4](https://www.cloudflare.com/ips-v4) and [Cloudflare IPv6](https://www.cloudflare.com/ips-v6). Check these authoritative lists when maintaining the firewall; changes must be reflected in both web rules. Keep DNS records proxied. Verify the public domain still responds after saving each rule. This restricts web access to Cloudflare networks; it does not authenticate a particular Cloudflare zone.

## Content Security Policy

Astro generates a CSP meta element for content pages at build time, configured in `astro.config.mjs`. It permits same-origin resources, GitHub and the contributions API for browser connections, and hashes for inline scripts/styles. The manually rendered reveal bootstrap, font definitions and JSON-LD register hashes of their exact payloads. Build-time LeetCode requests are not browser requests and need no CSP allowance.

Inline style attributes remain allowed for sonar timing, reveal effects and Shiki syntax highlighting. Inline JavaScript and eval are not broadly allowed. Astro emits general warnings about Shiki and separately scoped style attributes; `style-src-attr 'unsafe-inline'` deliberately supports those attributes while style elements use hashes. Framing remains blocked by nginx's `X-Frame-Options: DENY`; `frame-ancestors` cannot be enforced through a CSP meta element.

Use `npm run build` and `npm run preview` to verify CSP (the dev server does not enforce Astro's generated policy). Check EN, PT, case studies and the 404 page for CSP console errors, working fonts, sonar/reveals and GitHub updates. The generated root redirect has no content layout; production `/` is redirected by nginx.

This policy ships with the static site after a normal deploy; it requires no nginx reload. If Cloudflare features inject scripts in the future, review those scripts and the policy before enabling them. Do not add a second restrictive CSP header without accounting for the generated policy: browsers enforce both.

Reference: [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp).
