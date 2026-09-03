import { Component, signal, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit, OnDestroy {
  readonly title = signal('Borges');

  currentTime = signal(new Date());
  internalId: any;

  formatTime(zone: string) {
    return this.currentTime().toLocaleTimeString('pt-BR', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatDate(zone: string) {
    return this.currentTime().toLocaleDateString('pt-BR', {
      timeZone: zone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  ngOnInit(): void {
    this.internalId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.internalId);
  }
}
