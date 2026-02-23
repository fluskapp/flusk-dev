/**
 * Unit test template generator — class test sections
 */

export function generateClassTests(classes: string[]): string {
  return classes.map(cls => `
  describe('${cls}', () => {
    let instance: ${cls};

    beforeEach(() => {
      instance = new ${cls}();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should create instance successfully', () => {
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(${cls});
    });

    it('should execute main method successfully', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await instance.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(instance.execute(invalidInput as any)).rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      // Arrange
      const input = { invalid: true };

      // Act & Assert
      await expect(instance.execute(input)).rejects.toThrow();
    });

    it('should return expected output format', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await instance.execute(input);

      // Assert
      expect(result).toMatchObject({});
    });
  });
`).join('\n');
}
