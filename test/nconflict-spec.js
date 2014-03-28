(function() {
    describe('避免命名空间冲突', function() {
        it('退还Appbone命名空间', function() {
            var previousAppbone = Appbone.noConflict();
            expect(window.Appbone).not.toBeDefined();

            window.Appbone = previousAppbone;
            expect(window.Appbone).toBe(Appbone);
        });
    });
})();