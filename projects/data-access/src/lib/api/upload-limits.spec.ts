import { formatMegabytes, TRANSFER_PROOF_MAX_BYTES, UPLOAD_MAX_BYTES } from './upload-limits';
import { IMAGE_UPLOAD_RULES } from './services/admin-offers.api';

describe('upload-limits', () => {
  it('límite general de 15 MB para comprobantes e imágenes', () => {
    expect(UPLOAD_MAX_BYTES).toBe(15 * 1024 * 1024);
    expect(TRANSFER_PROOF_MAX_BYTES).toBe(UPLOAD_MAX_BYTES);
    expect(IMAGE_UPLOAD_RULES.maxBytes).toBe(UPLOAD_MAX_BYTES);
  });

  it('formatMegabytes', () => {
    expect(formatMegabytes(UPLOAD_MAX_BYTES)).toBe('15 MB');
    expect(formatMegabytes(20_971_520)).toBe('20 MB');
  });
});
