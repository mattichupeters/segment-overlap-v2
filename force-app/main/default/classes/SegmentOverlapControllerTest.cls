@IsTest
private class SegmentOverlapControllerTest {

    @IsTest
    static void getSegments_surfacesError() {
        try {
            Test.startTest();
            SegmentOverlapController.getSegments();
            Test.stopTest();
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
    }

    @IsTest
    static void calculateMultiOverlap_surfacesError() {
        try {
            Test.startTest();
            SegmentOverlapController.calculateMultiOverlap(
                new List<String>{ 'seg001', 'seg002' }
            );
            Test.stopTest();
            System.assert(false, 'Expected exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
    }

    @IsTest
    static void calculateOverlap_surfacesError() {
        try {
            Test.startTest();
            SegmentOverlapController.calculateOverlap(
                'seg001', 'seg002', 1000L, 800L
            );
            Test.stopTest();
            System.assert(false, 'Expected exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
    }

    @IsTest
    static void createSegmentFromOverlap_surfacesError() {
        try {
            Test.startTest();
            SegmentOverlapController.createSegmentFromOverlap(
                new List<String>{ 'seg001', 'seg002' },
                'Test Overlap Segment'
            );
            Test.stopTest();
            System.assert(false, 'Expected exception');
        } catch (AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage());
        }
    }

    @IsTest
    static void createSegmentFromOverlap_validatesEmptyName() {
        try {
            Test.startTest();
            SegmentOverlapController.createSegmentFromOverlap(
                new List<String>{ 'seg001', 'seg002' },
                ''
            );
            Test.stopTest();
            System.assert(false, 'Expected exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('segment name'),
                'Should mention segment name'
            );
        }
    }

    @IsTest
    static void createSegmentFromOverlap_validatesSegmentCount() {
        try {
            Test.startTest();
            SegmentOverlapController.createSegmentFromOverlap(
                new List<String>{ 'seg001' },
                'Test Segment'
            );
            Test.stopTest();
            System.assert(false, 'Expected exception');
        } catch (AuraHandledException e) {
            System.assert(
                e.getMessage().contains('2 to 4'),
                'Should mention 2 to 4 segments'
            );
        }
    }
}