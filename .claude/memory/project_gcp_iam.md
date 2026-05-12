---
name: project-gcp-iam
description: "Google Cloud IAM concepts — principals, roles, allow policies, resource hierarchy, policy inheritance, advanced access control"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ab73896-e009-4bea-8b4e-76e0214e4f57
---

# Google Cloud IAM Overview

IAM controls **who** (principal) can do **what** (role/permissions) on **which** (resource).

## Core Components

- **Principal**: Identity authenticated to GCP. Two categories:
  - Human users: Google Accounts, Google Groups, workforce identity pool federated identities
  - Workloads: Service accounts, workload identity pool federated identities
- **Role**: Collection of permissions. Permissions follow `service.resource.verb` format (e.g. `resourcemanager.projects.list`). You cannot grant permissions directly — only roles.
  - **Predefined roles**: managed by Google Cloud services (e.g. `roles/pubsub.publisher`)
  - **Custom roles**: user-defined, full control but higher maintenance burden
  - **Basic roles**: highly permissive (Owner, Editor, Viewer) — testing only, not production
- **Resource**: GCP resource the principal accesses. Roles granted via **allow policies** (YAML/JSON attached to a resource).

## Resource Hierarchy & Policy Inheritance

```
Organization (root)
  └── Folders
        └── Projects
              └── Service-specific resources
```

- Allow policies set on a container (org/folder/project) **inherit down** to all child resources.
- **Effective allow policy** = union of the resource's own policy + all ancestor policies.
- Resources that can't have their own allow policy can still be accessed by granting a role on an ancestor.

## Advanced Access Control

- **Deny policies**: Block specific permissions even if a role grants them.
- **Principal Access Boundary (PAB) policies**: Limit which resources a principal is *eligible* to access.
- **IAM Conditions**: Attribute-based, conditional role bindings (e.g. time-of-day, resource type).
- **Privileged Access Manager (PAM)**: Temporary, auditable, just-in-time access with optional approval workflows.

## API Consistency

The IAM API is **eventually consistent** — changes may not be immediately visible to reads or access checks.

**Why:** Reference for intern work involving GCP IAM setup, service account management, or permission troubleshooting.
**How to apply:** Use when discussing GCP access control, granting roles, or designing least-privilege architectures.
