---
name: project-access-control-theory
description: "Security Engineering Ch.6 — access control theory, ACLs, capabilities, DAC/MAC, OS security models, hardware protection, common attacks and remedies"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ab73896-e009-4bea-8b4e-76e0214e4f57
---

# Access Control Theory (Security Engineering, 3rd Ed., Ch. 6)

Access control controls **which principals** (persons, processes, machines) have access to **which resources** — files, programs, data, comms ports.

## Access Control Models

### Access Control Matrix
Rows = users, columns = resources, cells = permissions (r/w/x/-). Doesn't scale (50k users × 300 apps = 15M entries). Stored two ways:

- **Access Control Lists (ACLs)**: Matrix by column. Each resource stores who can access it. Natural for file systems (Unix rwx). Good when policy is data-oriented; bad for large/changing user populations and for finding all files a user can access.
- **Capabilities**: Matrix by row. Each user holds a "ticket" listing their access rights. Good for runtime efficiency and delegation; bad for revoking access system-wide.

### Groups & Roles
- **Group**: list of principals
- **Role**: fixed set of access permissions assumed for a period of time (e.g. "officer of the watch")
- Combined: group membership + role assumption

## OS Access Control Models

### DAC (Discretionary Access Control)
Machine owner sets policy; users can modify access to their own objects. Foundation of Unix/Linux.

### MAC (Mandatory Access Control)
Policy set by a central authority; users cannot override it. Used in military/classified systems (multilevel secure, MLS). Also used for DRM, safety integrity levels. Implemented via TPM (Trusted Platform Module) for tamper-resistant boot.

## OS-Specific Implementations

### Unix/Linux
- Files have `rwx` flags for owner/group/world
- `root` (uid=0) bypasses all access checks — single point of failure
- `suid` bit: runs a program with the file owner's privileges, not the invoker's
- ACLs don't express program context — only user + file, not (user, program, file) triples
- SELinux (since Android 5): mandatory access control for Linux, developed by NSA

### macOS
- Based on FreeBSD/Mach kernel with BSD layer for memory protection
- Since 10.5 (Leopard): TrustedBSD for MAC mechanisms
- Root disabled by default; admin users in 'wheel' group `su` to root

### iOS
- Unique file pathnames (unlike vanilla Unix inodes)
- MAC via Domain and Type Enforcement (DTE)
- Apps have **permissions** (capabilities) for device services
- Secure Enclave (SE) for biometrics/payments — separate from iOS/TrustZone
- Closed ecosystem: only Apple-signed apps

### Android
- Based on Linux; apps run as different userids
- Apps have permissions (capabilities) for SMSes, camera, contacts, etc.
- Since Android 5: SELinux for MAC
- Since Android 6: trust-on-first-use permission model

### Windows
- Windows 4 (NT): Added `take ownership`, `change permissions`, `delete` beyond rwx
- ACL values: `AccessDenied` > `AccessAllowed` > `SystemAudit` (parsed in order)
- Active Directory: hierarchical namespace for users, groups, machines
- Windows Vista+: UAC, integrity levels (low/medium/high), trusted boot
- Windows 8: Dynamic Access Control via account attributes/Kerberos claims
- Windows 8.1: Principals + SIDs abstraction

## Hardware Protection

- **Rings of protection** (Multics → x86): ring 0 = kernel, ring 3 = user code. Gates allow controlled cross-ring calls.
- **Intel VT** (2006+): hardware virtualisation support → cloud computing
- **Intel SGX**: encrypted enclaves in memory; threatened by ROP and Spectre-class attacks
- **Arm TrustZone**: 'two worlds' model — normal world + secure world (TEE). Used for SIM cards, fingerprints.
- **Arm CHERI**: fine-grained capability support within a process

## Middleware Access Control

### Databases (Oracle, MySQL, MariaDB)
- Own access control on top of OS; mix of ACLs and capabilities
- Critical because web servers pass transactions directly to databases
- SQL injection: #1 threat when user input isn't sanitised before hitting the database

### Browsers
- Same-origin policy: JS can only communicate with the IP it came from
- CSRF attacks exploit valid session cookies via malicious links/forms
- Drive-by download attacks via malicious web pages

### Sandboxing
- Java introduced the 'sandbox' model: restricted environment, same-origin, JVM enforced
- Chrome: each tab in a separate OS process

### Virtualisation & Containers
- VMs: full OS under a hypervisor; strong isolation but heavy
- Containers: shared kernel, namespaced processes; lighter but weaker isolation
- Both threatened by Meltdown and Spectre side-channel attacks

## Common Attacks

| Attack | Description |
|--------|-------------|
| Stack smashing / buffer overflow | Over-long input overwrites stack; classic Morris worm (1988). Mitigated by stack canaries, DEP, ASLR. |
| Use-after-free | Freed memory chunk reused maliciously |
| SQL injection | Unsanitised user input interpreted as SQL |
| Race conditions / TOCTTOU | State changed between access check and use |
| Return-oriented programming (ROP) | Chain existing code gadgets to bypass DEP |
| Side channels (Meltdown, Spectre) | CPU pipeline speculation leaks cross-process memory |
| Confused deputy | Program with authority A acts on behalf of B, with A's authority |
| Trojan horse | Malicious program masquerading as legitimate utility |

## Defences / Remedies

1. **Stack canaries** — random value before return address; detect overwrites
2. **DEP (Data Execution Prevention)** — marks memory as data OR code, not both
3. **ASLR** — randomises memory layout per execution
4. **Control Flow Integrity (CFI)** — validates indirect control-flow transfers at runtime
5. **Static analysis** (Coverity etc.) — find bugs before deployment
6. **Memory-safe languages** (Rust) — eliminate whole classes of memory bugs
7. **Principle of least privilege** — programs/users get only what they need
8. **DevSecOps** — security integrated into agile development pipeline

## Environmental Creep
Security models fail when the environment they were designed for changes (e.g., Unix designed for trusted single-machine users, then extended to untrusted global internet without redesigning the security model).

**Why:** Reference for intern work involving security architecture decisions, threat modeling, or understanding access control system design.
**How to apply:** Use when discussing system security, privilege design, attack surfaces, or OS/database security hardening.
