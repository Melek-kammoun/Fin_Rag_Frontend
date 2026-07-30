import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable } from 'rxjs';

import { IngestionJob } from '../models/ingestion-job.model';

/**
 * Wraps a single shared STOMP/WebSocket connection used to receive live
 * ingestion job updates, replacing the previous `interval(3000) + http GET`
 * polling loop.
 *
 * Backend contract (see WebSocketConfig / RegulationIngestionPipelineService):
 * - SockJS endpoint: http://localhost:8081/ws
 * - /topic/jobs/{jobId}  -> updates for one specific job (upload page)
 * - /topic/jobs          -> every job update, any id (history page)
 */
@Injectable({
  providedIn: 'root',
})
export class JobSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly wsUrl = 'http://localhost:8081/ws';

  private client: Client | null = null;
  private connectPromise: Promise<void> | null = null;

  /** Subscribes to updates for a single job. Completes automatically on unsubscribe. */
  watchJob(jobId: number): Observable<IngestionJob> {
    return this.watchTopic(`/topic/jobs/${jobId}`);
  }

  /** Subscribes to updates for every job (used by the history page for live refresh). */
  watchAllJobs(): Observable<IngestionJob> {
    return this.watchTopic('/topic/jobs');
  }

  private watchTopic(destination: string): Observable<IngestionJob> {
    return new Observable<IngestionJob>((subscriber) => {
      if (!this.isBrowser) {
        // SSR: no WebSocket available, just complete without emitting.
        subscriber.complete();
        return;
      }

      let stompSub: StompSubscription | undefined;
      let cancelled = false;

      this.ensureConnected()
        .then((client) => {
          if (cancelled) {
            return;
          }
          stompSub = client.subscribe(destination, (message: IMessage) => {
            try {
              subscriber.next(JSON.parse(message.body) as IngestionJob);
            } catch {
              // Ignore malformed frames rather than tearing down the subscription.
            }
          });
        })
        .catch((error) => subscriber.error(error));

      return () => {
        cancelled = true;
        stompSub?.unsubscribe();
      };
    });
  }

  private ensureConnected(): Promise<Client> {
    if (this.client?.connected) {
      return Promise.resolve(this.client);
    }

    if (!this.connectPromise) {
      const client = new Client({
        webSocketFactory: () => new SockJS(this.wsUrl),
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
      });

      this.connectPromise = new Promise<void>((resolve, reject) => {
        client.onConnect = () => resolve();
        client.onStompError = (frame) => reject(new Error(frame.headers['message'] ?? 'STOMP error'));
        client.onWebSocketError = (event) => reject(event);
      });

      this.client = client;
      client.activate();
    }

    return this.connectPromise.then(() => this.client as Client);
  }

  ngOnDestroy(): void {
    this.client?.deactivate();
    this.client = null;
    this.connectPromise = null;
  }
}
