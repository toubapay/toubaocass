<?php

use App\Http\Controllers\Api\Admin\AuditLogController as AdminAuditLogController;
use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\BackupController as AdminBackupController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\DeliveryManagementController as AdminDeliveryManagementController;
use App\Http\Controllers\Api\Admin\DemLeguiTripManagementController as AdminDemLeguiTripManagementController;
use App\Http\Controllers\Api\Admin\DriverDirectoryController as AdminDriverDirectoryController;
use App\Http\Controllers\Api\Admin\FareSettingsController as AdminFareSettingsController;
use App\Http\Controllers\Api\Admin\FinancialsController as AdminFinancialsController;
use App\Http\Controllers\Api\Admin\InsuranceController as AdminInsuranceController;
use App\Http\Controllers\Api\Admin\KycController as AdminKycController;
use App\Http\Controllers\Api\Admin\LiveTripsController as AdminLiveTripsController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\SecurityAlertController as AdminSecurityAlertController;
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\Admin\StaffController as AdminStaffController;
use App\Http\Controllers\Api\Admin\TripManagementController as AdminTripManagementController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AnandoRideController;
use App\Http\Controllers\Api\AnandoRideMessageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\CityController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DeliveryMessageController;
use App\Http\Controllers\Api\DemLeguiController;
use App\Http\Controllers\Api\DemLeguiMessageController;
use App\Http\Controllers\Api\DriverActiveChatController;
use App\Http\Controllers\Api\DriverAvailabilityController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\DriverReportController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\InsuranceController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ModuleStatusController;
use App\Http\Controllers\Api\ProfileStatsController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\RiderActiveChatController;
use App\Http\Controllers\Api\RiderReportController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:otp')->group(function () {
        Route::post('otp/request', [AuthController::class, 'requestOtp']);
        Route::post('otp/verify', [AuthController::class, 'verifyOtp']);
    });

    // Returning-user shortcut: phone + 4-digit PIN instead of a fresh SMS
    // OTP round-trip. Rate-limited separately (see AppServiceProvider) —
    // a 4-digit PIN's tiny keyspace needs tighter throttling than OTP.
    Route::post('pin/login', [AuthController::class, 'loginWithPin'])->middleware('throttle:pin');
});

Route::get('cities', [CityController::class, 'index']);
Route::get('modules/status', [ModuleStatusController::class, 'index']);

// SOS "share my live position" link — public, no login, signature-gated.
Route::get('track/{type}/{id}', [TrackingController::class, 'show'])
    ->name('public.track')
    ->middleware('signed');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::put('profile', [AuthController::class, 'updateProfile']);
    Route::post('fcm-token', [AuthController::class, 'updateFcmToken']);
    Route::post('logout', [AuthController::class, 'logout']);
    // Set (or change) the PIN used by auth/pin/login above — prompted right
    // after OTP verification for anyone who doesn't have one yet.
    Route::post('auth/pin/set', [AuthController::class, 'setPin']);

    // Chat on a booking — shared between the rider who booked and the
    // driver of that trip (authorized per-booking, not per-role).
    Route::get('bookings/{booking}/messages', [MessageController::class, 'index']);
    Route::post('bookings/{booking}/messages', [MessageController::class, 'store']);

    // Unified inbox — every chat thread (trip bookings, Dem Légui, Anando,
    // deliveries) the authenticated user is a participant in, with a
    // per-thread unread count. Powers the inbox icon/badge and page on
    // both rider and driver apps; role-agnostic, same as active-chat below.
    Route::get('inbox', [InboxController::class, 'index']);

    // Wallet — available to both riders and drivers. Top-ups aren't
    // self-service; they're credited by an admin (see the wallet:top-up
    // Artisan command), so there's no top-up endpoint here.
    Route::get('wallet', [WalletController::class, 'show']);

    // Profile dashboard stats — same role-agnostic shape for every user.
    Route::get('profile/stats', [ProfileStatsController::class, 'index']);

    // Saved addresses — available to both riders and drivers.
    Route::get('addresses', [AddressController::class, 'index']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::put('addresses/{address}', [AddressController::class, 'update']);
    Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

    // Anando — peer-to-peer instant ride sharing. Any authenticated user
    // (rider or driver) can post a ride and any other user can join a
    // seat, so this deliberately sits outside the role:rider/role:driver
    // groups below.
    Route::get('anando-rides', [AnandoRideController::class, 'index']);
    Route::post('anando-rides', [AnandoRideController::class, 'store'])->middleware('module:anando');
    Route::get('anando-rides/mine', [AnandoRideController::class, 'myRides']);
    Route::get('anando-rides/my-bookings', [AnandoRideController::class, 'myBookings']);
    Route::get('anando-rides/{anandoRide}', [AnandoRideController::class, 'show']);
    Route::delete('anando-rides/{anandoRide}', [AnandoRideController::class, 'cancelRide']);
    Route::post('anando-rides/{anandoRide}/join', [AnandoRideController::class, 'join']);
    Route::post('anando-rides/{anandoRide}/start', [AnandoRideController::class, 'start']);
    Route::post('anando-rides/{anandoRide}/complete', [AnandoRideController::class, 'complete']);
    Route::post('anando-rides/{anandoRide}/location', [AnandoRideController::class, 'updateLocation']);
    Route::post('anando-rides/{anandoRide}/rate', [AnandoRideController::class, 'rate']);
    Route::put('anando-ride-bookings/{anandoRideBooking}', [AnandoRideController::class, 'updateBooking']);
    Route::delete('anando-ride-bookings/{anandoRideBooking}', [AnandoRideController::class, 'cancelBooking']);
    Route::post('anando-rides/{anandoRide}/share-link', [AnandoRideController::class, 'shareLink']);
    Route::post('anando-rides/{anandoRide}/sos', [AnandoRideController::class, 'sos']);

    // Chat on an Anando booking — shared between the joiner and the
    // poster of the ride (authorized per-booking, mirrors bookings/messages
    // above).
    Route::get('anando-ride-bookings/{anandoRideBooking}/messages', [AnandoRideMessageController::class, 'index']);
    Route::post('anando-ride-bookings/{anandoRideBooking}/messages', [AnandoRideMessageController::class, 'store']);

    // SOS "share my live position" links for Trip and Dem Légui — sit
    // outside the role:rider/role:driver groups since either side of the
    // ride (driver or a confirmed rider) may want to generate their own.
    Route::post('trips/{trip}/share-link', [TripController::class, 'shareLink']);
    Route::post('trips/{trip}/sos', [TripController::class, 'sos']);
    Route::post('dem-legui/trips/{demLeguiTrip}/share-link', [DemLeguiController::class, 'shareLink']);
    Route::post('dem-legui/trips/{demLeguiTrip}/sos', [DemLeguiController::class, 'sos']);

    // Livraison "share package tracking" link — either the sender or the
    // courier may want to generate it, so it sits outside the role groups
    // just like the ride share-links above.
    Route::post('deliveries/{delivery}/share-link', [DeliveryController::class, 'shareLink']);
    Route::post('deliveries/{delivery}/sos', [DeliveryController::class, 'sos']);

    // Chat on a delivery — shared between the sender and the assigned
    // driver (authorized per-delivery, mirrors bookings/messages above).
    Route::get('deliveries/{delivery}/messages', [DeliveryMessageController::class, 'index']);
    Route::post('deliveries/{delivery}/messages', [DeliveryMessageController::class, 'store']);

    // Assurance — vehicle-attribute based (no existing platform Car
    // required), open to any authenticated user (rider or driver). Mirrors
    // the car-based driver flow further below but decoupled from the
    // Car/fleet system, per
    // InsuranceComparisonService::compareForVehicle()/purchaseForVehicle().
    Route::post('insurance/vehicles/scan', [InsuranceController::class, 'scanVehicleDocument']);
    Route::post('insurance/vehicles/quotes', [InsuranceController::class, 'quoteForVehicle']);
    Route::post('insurance/vehicles/policies', [InsuranceController::class, 'purchaseForVehicle'])->middleware('module:assurance');
    Route::get('insurance/my-policies', [InsuranceController::class, 'myPolicies']);

    // Rider-facing trip search & booking.
    Route::middleware('role:rider')->group(function () {
        // Powers the floating chat button — resolves the single most
        // relevant conversation across all this rider's bookings/requests.
        Route::get('rider/active-chat', [RiderActiveChatController::class, 'show']);

        // Powers the post-trip rating popup on the rider-web home screen —
        // the single most recently completed, not-yet-rated Trip/Delivery/
        // Dem Légui trip, if any.
        Route::get('me/pending-rating', [RatingController::class, 'pendingRating']);

        // "Mes dépenses" mini-report on the rider's profile page.
        Route::get('me/spending-report', [RiderReportController::class, 'spending']);

        Route::get('trips', [TripController::class, 'search']);
        Route::get('trips/instant', [TripController::class, 'instantIndex']);
        Route::get('trips/{trip}', [TripController::class, 'show']);
        Route::post('trips/{trip}/bookings', [BookingController::class, 'store']);
        Route::get('bookings', [BookingController::class, 'index']);
        Route::put('bookings/{booking}', [BookingController::class, 'update']);
        Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);
        // Post-trip driver feedback — 1-5 stars, only once the trip is completed.
        Route::post('trips/{trip}/rate', [TripController::class, 'rate']);

        // Livraison (package delivery) requests.
        Route::post('deliveries/quote', [DeliveryController::class, 'quote']);
        Route::get('deliveries', [DeliveryController::class, 'index']);
        Route::post('deliveries', [DeliveryController::class, 'store'])->middleware('module:livraison');
        Route::get('deliveries/{delivery}', [DeliveryController::class, 'show']);
        Route::put('deliveries/{delivery}', [DeliveryController::class, 'update']);
        Route::delete('deliveries/{delivery}', [DeliveryController::class, 'destroy']);
        Route::post('deliveries/{delivery}/rate', [DeliveryController::class, 'rate']);

        // Dem Légui — on-demand ride request (rider-initiated, dispatched to
        // online drivers).
        Route::post('dem-legui/requests/quote', [DemLeguiController::class, 'quote']);
        Route::post('dem-legui/requests', [DemLeguiController::class, 'store'])->middleware('module:dem_legui');
        Route::get('dem-legui/requests/mine/active', [DemLeguiController::class, 'myActiveRequest']);
        Route::get('dem-legui/requests/mine', [DemLeguiController::class, 'myRequests']);
        Route::delete('dem-legui/requests/{demLeguiRequest}', [DemLeguiController::class, 'cancel']);
        Route::get('dem-legui/requests/{demLeguiRequest}/nearby-drivers', [DemLeguiController::class, 'nearbyDrivers']);
        Route::post('dem-legui/trips/{demLeguiTrip}/rate', [DemLeguiController::class, 'rate']);
    });

    // Dem Légui show endpoints sit outside the role:rider/role:driver groups
    // since both a request's rider and its matched trip's driver/riders
    // need to poll them — mirrors anando-rides/{id} below.
    Route::get('dem-legui/requests/{demLeguiRequest}', [DemLeguiController::class, 'show']);
    Route::get('dem-legui/trips/{demLeguiTrip}', [DemLeguiController::class, 'showTrip']);

    // Chat on a Dem Légui request — shared between its rider and the driver
    // of the trip it's matched to (authorized per-request via policy, same
    // shape as bookings/{booking}/messages above).
    Route::get('dem-legui/requests/{demLeguiRequest}/messages', [DemLeguiMessageController::class, 'index']);
    Route::post('dem-legui/requests/{demLeguiRequest}/messages', [DemLeguiMessageController::class, 'store']);

    // Driver-facing KYC, fleet, and trip management.
    Route::prefix('driver')->middleware('role:driver')->group(function () {
        Route::get('kyc', [DriverController::class, 'showKyc']);
        Route::post('kyc/scan', [DriverController::class, 'scanLicense']);
        Route::post('kyc', [DriverController::class, 'submitKyc']);

        // Online/offline availability toggle — going online is required to
        // be dispatched Dem Légui ride requests.
        Route::put('availability', [DriverAvailabilityController::class, 'update']);
        Route::post('location', [DriverAvailabilityController::class, 'updateLocation']);

        // Powers the floating chat button — resolves the single most
        // relevant conversation across all this driver's trips/requests.
        Route::get('active-chat', [DriverActiveChatController::class, 'show']);

        // Reviews riders/senders have left, across Trip/Dem Légui/Delivery.
        Route::get('ratings', [RatingController::class, 'mine']);

        // "Mes revenus" mini-report on the driver's profile page.
        Route::get('earnings-report', [DriverReportController::class, 'earnings']);

        Route::get('cars', [CarController::class, 'index']);
        Route::post('cars', [CarController::class, 'store']);
        Route::put('cars/{car}', [CarController::class, 'update']);
        Route::delete('cars/{car}', [CarController::class, 'destroy']);

        Route::get('trips', [TripController::class, 'driverIndex']);
        Route::post('trips', [TripController::class, 'store']);
        Route::post('trips/instant', [TripController::class, 'storeInstant'])->middleware('module:instant_trips');
        Route::get('trips/{trip}', [TripController::class, 'driverShow']);
        Route::put('trips/{trip}', [TripController::class, 'update']);
        Route::post('trips/{trip}/start', [TripController::class, 'start']);
        Route::post('trips/{trip}/arrived', [TripController::class, 'arrived']);
        Route::post('trips/{trip}/complete', [TripController::class, 'complete']);
        Route::post('trips/{trip}/location', [TripController::class, 'updateLocation']);
        Route::delete('trips/{trip}', [TripController::class, 'cancel']);

        // Livraison (package delivery) browsing & fulfillment.
        Route::get('deliveries/available', [DeliveryController::class, 'availableIndex']);
        Route::get('deliveries', [DeliveryController::class, 'driverIndex']);
        Route::get('deliveries/{delivery}', [DeliveryController::class, 'driverShow']);
        Route::post('deliveries/{delivery}/accept', [DeliveryController::class, 'accept']);
        Route::post('deliveries/{delivery}/pickup', [DeliveryController::class, 'pickup']);
        Route::post('deliveries/{delivery}/deliver', [DeliveryController::class, 'deliver']);
        Route::post('deliveries/{delivery}/location', [DeliveryController::class, 'updateLocation']);

        // Dem Légui — browsing/accepting nearby ride requests and managing
        // the resulting shared trip.
        Route::get('dem-legui/requests', [DemLeguiController::class, 'availableIndex']);
        Route::post('dem-legui/requests/{demLeguiRequest}/accept', [DemLeguiController::class, 'accept']);
        Route::get('dem-legui/trips/mine', [DemLeguiController::class, 'myTrips']);
        Route::get('dem-legui/trips/mine/active', [DemLeguiController::class, 'myActiveTrip']);
        Route::post('dem-legui/trips/{demLeguiTrip}/arrived', [DemLeguiController::class, 'arrivedAtPickup']);
        Route::post('dem-legui/trips/{demLeguiTrip}/start', [DemLeguiController::class, 'startTrip']);
        Route::post('dem-legui/trips/{demLeguiTrip}/complete', [DemLeguiController::class, 'completeTrip']);
        Route::post('dem-legui/trips/{demLeguiTrip}/location', [DemLeguiController::class, 'updateTripLocation']);

        // Assurance (vehicle insurance comparison & purchase).
        Route::get('insurance/providers', [InsuranceController::class, 'providers']);
        Route::post('insurance/quotes', [InsuranceController::class, 'quote']);
        Route::post('insurance/policies', [InsuranceController::class, 'purchase'])->middleware('module:assurance');
        Route::get('insurance/policies', [InsuranceController::class, 'index']);
    });
});

// Admin back-office — separate admin_users identity/guard, not riders/drivers.
Route::prefix('admin')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'admin.auth'])->group(function () {
        Route::get('me', [AdminAuthController::class, 'me']);
        Route::post('logout', [AdminAuthController::class, 'logout']);

        Route::middleware('admin.permission:manage_users')->group(function () {
            Route::get('users', [AdminUserController::class, 'index']);
            Route::get('users/{user}', [AdminUserController::class, 'show']);
            Route::put('users/{user}/status', [AdminUserController::class, 'updateStatus']);
        });

        Route::middleware('admin.permission:manage_kyc')->group(function () {
            Route::get('kyc/queue', [AdminKycController::class, 'queue']);
            Route::get('kyc/{driverProfile}', [AdminKycController::class, 'show']);
            Route::get('kyc/{driverProfile}/document/{field}', [AdminKycController::class, 'document']);
            Route::post('kyc/{driverProfile}/approve', [AdminKycController::class, 'approve']);
            Route::post('kyc/{driverProfile}/reject', [AdminKycController::class, 'reject']);
        });

        Route::middleware('admin.permission:manage_system_settings')->group(function () {
            Route::get('settings/kyc-mode', [AdminSettingsController::class, 'kycMode']);
            Route::put('settings/kyc-mode', [AdminSettingsController::class, 'updateKycMode']);
        });

        Route::middleware('admin.permission:manage_fares')->group(function () {
            Route::get('settings/fares', [AdminFareSettingsController::class, 'index']);
            Route::put('settings/fares', [AdminFareSettingsController::class, 'update']);
        });

        Route::middleware('admin.permission:view_financials')->group(function () {
            Route::get('financials/summary', [AdminFinancialsController::class, 'summary']);
            Route::get('financials/report', [AdminFinancialsController::class, 'report']);
        });

        Route::middleware('admin.permission:view_dashboard')->group(function () {
            Route::get('dashboard/stats', [AdminDashboardController::class, 'stats']);
            Route::get('dashboard/routes', [AdminDashboardController::class, 'routes']);
            Route::get('trips/live', [AdminLiveTripsController::class, 'index']);
        });

        Route::middleware('admin.permission:view_security_alerts')->group(function () {
            Route::get('security-alerts', [AdminSecurityAlertController::class, 'index']);
            Route::put('security-alerts/{securityAlert}/acknowledge', [AdminSecurityAlertController::class, 'acknowledge']);
        });

        Route::middleware('admin.permission:manage_admins')->group(function () {
            Route::get('admins', [AdminStaffController::class, 'index']);
            Route::post('admins', [AdminStaffController::class, 'store']);
            Route::put('admins/{adminUser}', [AdminStaffController::class, 'update']);
            Route::get('audit-log', [AdminAuditLogController::class, 'index']);
        });

        Route::middleware('admin.permission:manage_backups')->group(function () {
            Route::get('backups', [AdminBackupController::class, 'index']);
            Route::post('backups', [AdminBackupController::class, 'store']);
            Route::get('backups/{path}/download', [AdminBackupController::class, 'download']);
        });

        Route::middleware('admin.permission:manage_insurance')->group(function () {
            Route::get('insurance/providers', [AdminInsuranceController::class, 'providers']);
            Route::post('insurance/providers', [AdminInsuranceController::class, 'storeProvider']);
            Route::put('insurance/providers/{insuranceProvider}', [AdminInsuranceController::class, 'updateProvider']);
            Route::get('insurance/policies', [AdminInsuranceController::class, 'policies']);
        });

        // Module registry — enable/disable/configure platform services (e.g.
        // Anando, Livraison, Assurance) without a deploy.
        Route::middleware('admin.permission:manage_modules')->group(function () {
            Route::get('modules', [AdminModuleController::class, 'index']);
            Route::post('modules', [AdminModuleController::class, 'store']);
            Route::put('modules/{module}', [AdminModuleController::class, 'update']);
            Route::put('modules/{module}/status', [AdminModuleController::class, 'updateStatus']);
            Route::delete('modules/{module}', [AdminModuleController::class, 'destroy']);
        });

        // Operational trip/delivery management — cancel or reassign a
        // driver, separate from the read-only live map above.
        Route::middleware('admin.permission:manage_trips')->group(function () {
            Route::get('trips', [AdminTripManagementController::class, 'index']);
            Route::post('trips/{trip}/cancel', [AdminTripManagementController::class, 'cancel']);
            Route::put('trips/{trip}/driver', [AdminTripManagementController::class, 'assignDriver']);

            Route::get('deliveries', [AdminDeliveryManagementController::class, 'index']);
            Route::post('deliveries/{delivery}/cancel', [AdminDeliveryManagementController::class, 'cancel']);
            Route::put('deliveries/{delivery}/driver', [AdminDeliveryManagementController::class, 'assignDriver']);

            Route::get('dem-legui-trips', [AdminDemLeguiTripManagementController::class, 'index']);
            Route::post('dem-legui-trips/{demLeguiTrip}/cancel', [AdminDemLeguiTripManagementController::class, 'cancel']);
            Route::put('dem-legui-trips/{demLeguiTrip}/driver', [AdminDemLeguiTripManagementController::class, 'assignDriver']);

            Route::get('drivers/eligible', [AdminDriverDirectoryController::class, 'eligible']);
        });
    });
});
