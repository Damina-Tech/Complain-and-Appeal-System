# CAS centralized sign-in

Realm: `chirocity` at `https://auth.chirocity.gov.et`.

- Public OIDC client: `cas-web`, client authentication OFF, standard flow ON, PKCE S256.
- Valid redirect and post logout redirect: `https://cas.chirocity.gov.et/login`.
- Web origin: `https://cas.chirocity.gov.et`.
- API audience/client: `cas-api`; include the API audience in access tokens.
- Attach the `roles` client scope to cas-web as Default and permit the required cas-api roles through its role scope mappings.
- Users require a verified email and CAS client roles under `resource_access["cas-api"].roles`.

| Client role | CAS group |
| --- | --- |
| ADMIN | Admin |
| MAYOR_OFFICE | Mayor Office |
| DIRECTOR | Director |
| FOCAL_PERSON | Focal Person |
| CITIZEN | Citizen |

Exact existing group names are also accepted as explicitly mapped client role aliases. Roles from other clients and realm roles grant no access. CAS has single-primary-role workflows: when several roles are assigned, the highest role in this table wins. Citizen case scoping and existing group permissions remain enforced.

Run the normal deployment workflow first, then **Configure CAS Chiro Auth** with the independently verified account email and Keycloak subject. Existing matching accounts are linked without changing their local ID, office assignment, cases or history. Ambiguous or conflicting identities are rejected. A new email is provisioned at the first authorized sign-in. Email alone never automatically links accounts.

The activation workflow validates the Keycloak redirect, backs up `.env`, retains the `/srv/cas` data directory and edge networks, enables AUTH_MODE=keycloak, and checks API health and rejection of local password login. On failure it restores the environment and API container. Local password, registration and Django admin login endpoints cannot bypass Chiro Auth. Profile/office data and local account disabling remain in CAS; credentials and grants are managed in Chiro Auth.

`0002_workflow_schema` replaces four omitted migrations whose applied names were verified on the VPS. It creates the missing workflow schema on fresh databases and retains existing production tables when all four historical migrations were applied. `0006_chiro_identity` adds only nullable identity fields. The deployment creates a SQLite backup before migration and does not run the demo seed. The regression script checks this historical upgrade path and preservation of the existing user ID.

Run **Verify live CAS browser login** after activation. It verifies rendering and the redirect to the Chiro Auth login form without signing in as a real user.
