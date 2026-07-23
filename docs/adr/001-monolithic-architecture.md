# ADR-001: Monolithic architecture

**Status:** Accepted

## Context:

The system requires three internal components - an HTTP API, a background release scanner, and an email notifier - all operating on shared subscription data. The task explicitly requires all functionality to run as a single service

## Decision

Monolithic architecture was chosen, because all components communicate in-process, do not have to scale independently and are tightly coupled by design

## Alternatives Considered

| Alternative               | Why rejected                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microservice architecture | It was rejected, because there is no need to scale any components independently, and service discovery + inter-service communication add overhead without benefit at this scale                         |
| Event-driven architecture | This architecture was rejected, because of the complexity. It would require a message queue to coordinate Scanner -> Notifier, adding operational complexity that isn't justified for this project size |

## Consequences

**Positive:**

- Everything can be deployed in a single deployment, there is no need for inter-service networking and the local development is easy

**Negatives:**

- Scanner and API share the same Node.JS process. A long-running scan doesn't block any resources, but a crash takes down the whole system
