# Security Specification: Orienteering & Amazing Race Platform

## 1. Data Invariants

1. **Event Governance**: Events, checkpoints, and global scoring configuration can only be created, modified, or deleted by verified Administrators and Organizers.
2. **Participant Integrity**: Participants can only submit `scanEvents` and `challengeSubmissions` associated with their authenticated UID and assigned Team ID.
3. **Score Immutability**: Participants can NEVER directly modify team score (`points`, `bonusPoints`, `penaltyPoints`, `totalScore`), nor directly update checkpoint configuration.
4. **Temporal Invariants**: All `scanEvents`, `challengeSubmissions`, and `activityLogs` must have immutable server timestamps (`request.time`).
5. **Terminal State Lockdown**: An event with `status == 'completed'` cannot have new scans or submissions added by participants.
6. **Parent-Child Integrity**: All checkpoint, team, scan, and submission records must reference a valid and existing `eventId`.
7. **Anti-Ghost Field (Strict Schemas)**: In accordance with Pillar 2, payload schemas are strictly enforced with `keys().hasOnly()` and size/type constraints.

---

## 2. The "Dirty Dozen" Threat Payloads

| # | Attack Vector | Target Path | Payload Summary | Expected Outcome |
|---|---------------|-------------|-----------------|------------------|
| 1 | Admin Privilege Escalation | `/events/{eventId}` | Non-admin user attempts `create` or `update` on event rules or title | `PERMISSION_DENIED` |
| 2 | Direct Score Tampering | `/teams/{teamId}` | Participant attempts to mutate `points: 9999` or `totalScore: 9999` | `PERMISSION_DENIED` |
| 3 | Cross-Team Impersonation | `/teams/{teamId}` | User B attempts to write or update User A's team metadata | `PERMISSION_DENIED` |
| 4 | Ghost Field Injection (Shadow Update) | `/scanEvents/{scanId}` | Valid scan payload + injected `bypassValidation: true` | `PERMISSION_DENIED` |
| 5 | Path Variable Poisoning | `/events/{long_junk_id_100kb}` | Attempt to create an event with >128-byte malicious path ID | `PERMISSION_DENIED` |
| 6 | Terminal Event Mutation | `/events/{eventId}/...` | Attempt to register new scans on a closed event | `PERMISSION_DENIED` |
| 7 | Log Forgery / Activity Spoofing | `/activityLogs/{logId}` | Participant attempts to forge a system/judge log entry | `PERMISSION_DENIED` |
| 8 | Orphaned Scan Submission | `/scanEvents/{scanId}` | Scan event pointing to non-existent checkpoint ID | `PERMISSION_DENIED` |
| 9 | Destructive Checkpoint Deletion | `/checkpoints/{cpId}` | Participant attempts `delete` on an active checkpoint | `PERMISSION_DENIED` |
| 10 | Retroactive Score Manipulation | `/challengeSubmissions/{subId}` | Participant attempts to flip status from `rejected` to `approved` | `PERMISSION_DENIED` |
| 11 | Unverified Email Spoofing | `/events/{eventId}` | User presenting admin email with `email_verified: false` | `PERMISSION_DENIED` |
| 12 | Excessive Payload Flooding | `/challengeSubmissions/{subId}` | Injected 5MB string into `contentText` violating size boundary | `PERMISSION_DENIED` |

---

## 3. Test Runner Design (`firestore.rules.test.ts`)
The test runner asserts that each of the Dirty Dozen vectors is rejected with `PERMISSION_DENIED` across all collection paths.
