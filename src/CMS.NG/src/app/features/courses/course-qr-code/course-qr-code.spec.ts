import { ComponentFixture, TestBed } from '@angular/core/testing';
import QRCode from 'qrcode';

import { CourseQrCode } from './course-qr-code';

describe('CourseQrCode', () => {
  let component: CourseQrCode;
  let fixture: ComponentFixture<CourseQrCode>;

  const expectedUrl = 'https://www.uuu.com.tw/Course/Show/123/AI-101';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseQrCode]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseQrCode);
    component = fixture.componentInstance;
    component.pkid = 123;
    component.courseId = 'AI-101';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('encodes the expected URL built from pkid and CourseId', async () => {
    const toDataUrl = spyOn(QRCode, 'toDataURL').and.callThrough();

    await component.generate();

    expect(component.targetUrl).toBe(expectedUrl);
    expect(toDataUrl).toHaveBeenCalled();
    expect(toDataUrl.calls.mostRecent().args[0]).toBe(expectedUrl);
  });

  it('shows the CourseId as the title', () => {
    fixture.detectChanges();

    const title = (fixture.nativeElement as HTMLElement).querySelector('.qr__title');
    expect(title?.textContent?.trim()).toBe('AI-101');
  });

  it('generates a PNG image data URL', async () => {
    await component.generate();

    expect(component.qrDataUrl).toMatch(/^data:image\/png/);
  });

  it('does not generate when pkid or CourseId is missing', async () => {
    component.pkid = 0;
    await component.generate();
    expect(component.qrDataUrl).toBe('');
  });

  it('download action produces a downloadable image named after the CourseId', async () => {
    await component.generate();

    // Capture the anchor the component builds for the download.
    const anchor = document.createElement('a');
    const clickSpy = spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);

    component.download();

    expect(anchor.href).toMatch(/^data:image\/png/);
    expect(anchor.download).toBe('AI-101.png');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('download does nothing before an image has been generated', () => {
    const createElement = spyOn(document, 'createElement');

    component.download(); // qrDataUrl still empty

    expect(createElement).not.toHaveBeenCalled();
  });
});
