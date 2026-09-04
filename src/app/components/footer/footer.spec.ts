import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve exibir a descrição do footer', () => {
    const html: HTMLElement = fixture.nativeElement;
    const footerTitle = html.querySelector('[data-testid="footer-title"]');
    expect(footerTitle).toBeTruthy();
    expect(footerTitle?.textContent).toBe('Borges - Built with C# - .NET - Angular');
  });
});
