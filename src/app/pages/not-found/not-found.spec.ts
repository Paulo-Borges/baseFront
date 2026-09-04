import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { NotFound } from './not-found';
import { By } from '@angular/platform-browser';

describe('Not Found Component', () => {
  let component: NotFound;
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar um componente com sucesso', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o titulo de Página não encontrada', () => {
    const html: HTMLElement = fixture.nativeElement;
    const tituloH1 = html.querySelector('h1');
    expect(tituloH1?.textContent).toBe('Página não encontrada');
  });

  it('deve ter um link, redirecionando pra pagina Inicial (/)', () => {
    const html: HTMLElement = fixture.nativeElement;
    const link = html.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/');
  });

  it('deve exibir 404', () => {
    const html: HTMLElement = fixture.nativeElement;
    const span404 = html.querySelector('[data-testid="not-found-404"]');
    expect(span404?.textContent).toBe('404');
  });

  it('deve encontrar o link usando o debugElement', () => {
    const debugDom = fixture.debugElement;
    const linkSDebugElement = debugDom.query(By.directive(RouterLink));
    expect(linkSDebugElement).toBeTruthy();

    const htmlA: HTMLAnchorElement = linkSDebugElement.nativeElement;
    expect(htmlA.getAttribute('href')).toBe('/');
  });
});
