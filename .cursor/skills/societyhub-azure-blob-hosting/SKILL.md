---
name: societyhub-azure-blob-hosting
description: >-
  SocietyHub Azure Blob storage and hosting shape. Use when uploading
  attachments, resident documents, signed URLs, or documenting Azure deploy
  targets (Container Apps, PostgreSQL, Redis).
---

# SocietyHub — Azure Blob + hosting

## Rules

- Store complaint attachments and resident verification docs in **Azure Blob**.
- Object keys prefixed by `tenant_id/`; authorize before download.
- Logical deploy: API + worker + web on Azure Container Apps/App Service; Azure Database for PostgreSQL; Azure Cache for Redis; Blob.
- Secrets via env / Key Vault when wired — never commit secrets.

## Spec

- [Architecture](../../../SocietyHub-Spec-v0.1/docs/03-Architecture.md) §§10, 15
