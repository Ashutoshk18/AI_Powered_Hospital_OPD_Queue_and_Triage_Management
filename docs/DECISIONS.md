# Architecture Decision Records (ADRs)

## ADR-001: Architecture Style - Modular Monolith with ML Service Boundary
- **Context:** The system needs to support high-integrity transactional queue operations (check-in, token generation, doctor consultation) while executing Python-based ML predictions.
- **Decision:** Build the main application as a modular monolithic Node.js/Express service with PostgreSQL, and deploy Python/FastAPI as a dedicated ML inference service accessed via HTTP REST.
- **Alternatives Considered:**
  1. Microservices architecture with Kafka / RabbitMQ (Rejected: excessive infrastructure, distributed transaction complexity, network overhead).
  2. Pure Python backend with Django (Rejected: slower async concurrency for real-time WebSocket/polling dashboards, less flexible full-stack ecosystem).
- **Consequences:** Simple deployment, single database transaction boundary, clear service separation for ML inference with zero memory impact on Node.js.

---

## ADR-002: Persistence Layer - PostgreSQL with Prisma ORM
- **Context:** Queue tokens require strict daily sequential uniqueness per department, and appointments require transactional state transitions.
- **Decision:** Utilize PostgreSQL as the relational database and Prisma ORM for schema definition, type generation, and migrations.
- **Alternatives Considered:**
  1. MongoDB with Mongoose (Rejected: lacks native relational foreign keys, race conditions during sequential counter generation without distributed locks).
  2. Raw PostgreSQL queries with `pg` (Rejected: high maintenance, lack of compile-time TypeScript type safety).
- **Consequences:** Guaranteed ACID transactions, auto-generated TypeScript database client, version-controlled SQL migrations.

---

## ADR-003: Queue Discipline - Dynamic Urgency Aging vs. Static Priority
- **Context:** Static priority queues cause indefinite starvation of low-urgency patients during peak hospital arrivals, while FCFS endangers high-urgency patients.
- **Decision:** Implement a parameterized Dynamic Priority Aging policy ($\text{PriorityScore} = W_{\text{tier}} + \alpha \cdot \text{WaitMinutes}$).
- **Alternatives Considered:**
  1. Strict FCFS (Rejected: fails clinical urgency requirements).
  2. Strict Priority Queue without aging (Rejected: causes severe starvation of routine/administrative cases).
- **Consequences:** Mathematically bounds maximum wait times for lower urgency tiers while prioritizing immediate and urgent cases.

---

## ADR-004: Fault-Tolerant ML Integration with Deterministic Fallback
- **Context:** The web application must remain operational even if the Python ML prediction service becomes slow, encounters an unhandled exception, or crashes.
- **Decision:** Wrap ML calls with a strict 3000ms timeout. In the event of timeout or HTTP error, calculate the wait time using a deterministic departmental heuristic ($\text{patients\_ahead} \times \text{avg\_consultation\_duration}$) and annotate the database record with `source: "FALLBACK_RULE"`.
- **Alternatives Considered:**
  1. Reject check-in if ML is unavailable (Rejected: unacceptable in a hospital reception environment).
  2. Mock/hardcode a random prediction (Rejected: dishonest, violates academic integrity and clinical predictability).
- **Consequences:** Guarantees 100% operational uptime for the reception check-in desk, with clear audit tracking of prediction provenance.


---

## ADR-005: Dual Database Support - SQLite for Zero-Friction Local Execution & PostgreSQL for Production
- **Context:** Host environment permissions restrict starting background PostgreSQL services without elevated Windows Administrator rights.
- **Decision:** Maintain `schema.prisma` configured for SQLite (`file:./dev.db`) for instant local development, zero-configuration testing, and self-contained examination demonstration, alongside `schema.postgresql.prisma` for containerized PostgreSQL production deployments.
- **Consequences:** Eliminates external service failures during local demonstrations and automated tests while preserving identical relational schemas, foreign key cascades, and unique constraints.
