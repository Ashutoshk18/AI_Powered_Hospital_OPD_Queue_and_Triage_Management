# Final B.Tech CSE Project Thesis: Chapter-Wise Report Outline

### Title: AI-Powered Hospital Outpatient Department (OPD) Queue and Triage Management System

---

## Chapter 1: Introduction
- 1.1 Context and Background of Hospital Outpatient Operations
- 1.2 Problem Statement: Inefficiencies in Static OPD Queues
- 1.3 Project Motivation and Objectives
- 1.4 Scope, Assumptions, and Ethical Boundaries
- 1.5 Organization of the Thesis

## Chapter 2: Literature Survey & Related Work
- 2.1 Healthcare Operations Research & Ambulatory Queuing Models
- 2.2 Clinical Triage Systems (ESI, MTS, and Outpatient Adaptations)
- 2.3 Machine Learning Applications in Hospital Waiting-Time Estimation
- 2.4 Fairness and Starvation Mitigation in Priority Queues
- 2.5 Research Gap Analysis

## Chapter 3: System Requirements & Architecture
- 3.1 Software Requirements Specification (Functional & Non-Functional)
- 3.2 System Architectural Design (Modular Monolith & Microservice Boundary)
- 3.3 Relational Database Design and Entity Relationships
- 3.4 RESTful API Architecture and Security Contracts
- 3.5 Role-Based Access Control (RBAC) Matrix

## Chapter 4: Methodology & Algorithms
- 4.1 Urgency Triage Classification Engine
- 4.2 Dynamic Priority Scoring and Mathematical Aging Formulation
- 4.3 Deterministic Tie-Breaking and Concurrency Protection
- 4.4 Machine Learning Waiting-Time Prediction Pipeline
  - 4.4.1 Feature Selection and Leakage Prevention
  - 4.4.2 Model Formulations (OLS, Random Forest)
  - 4.4.3 Fallback Estimator and Fault-Tolerance Design

## Chapter 5: Implementation Details
- 5.1 Backend Implementation (Node.js, Express, TypeScript, Prisma)
- 5.2 Machine Learning Microservice Implementation (FastAPI, Scikit-Learn)
- 5.3 Frontend Implementation (React, Tailwind CSS, Recharts)
- 5.4 Database Transactions and Concurrency Guarding

## Chapter 6: Experimental Evaluation & Results
- 6.1 Experimental Setup and Discrete-Event Simulation Parameters
- 6.2 ML Waiting-Time Prediction Results (MAE, RMSE, $R^2$ vs. Baseline)
- 6.3 Queue Policy Benchmark (FCFS vs. Pure Priority vs. Dynamic Aging)
- 6.4 Trade-Off Analysis: Priority Responsiveness vs. Routine Starvation
- 6.5 Doctor Utilization and Departmental Throughput Analysis

## Chapter 7: Verification, Testing & Security Audit
- 7.1 Test Strategy and Coverage Summary
- 7.2 API Integration and Concurrency Verification
- 7.3 STRIDE Threat Modeling and Security Review
- 7.4 Fault-Tolerance and Graceful Degradation Testing

## Chapter 8: Conclusion, Limitations & Future Work
- 8.1 Summary of Contributions
- 8.2 Limitations and Threats to Validity
- 8.3 Directions for Future Research (Multi-specialty chaining, mobile telemetry)

## References
- Peer-reviewed citations following IEEE format.

## Appendices
- Appendix A: API Reference Documentation
- Appendix B: Database Migration Scripts
- Appendix C: Viva Voce Defense Questions & Answers
