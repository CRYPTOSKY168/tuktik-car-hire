// ====================================
// TukTik Car Rental - Firestore Service
// ====================================
//
// This file re-exports all services for backward compatibility.
// New code should import directly from services:
//   import { BookingService } from '@/lib/firebase/services';
//
// ====================================

import { BookingService } from './services/BookingService';
import { DriverService } from './services/DriverService';
import { VehicleService } from './services/VehicleService';
import { UserService } from './services/UserService';
import { LocationService } from './services/LocationService';
import { NotificationService } from './services/NotificationService';
import { VoucherService } from './services/VoucherService';
import { SettingsService } from './services/SettingsService';

// Re-export individual services for direct import
export {
    BookingService,
    DriverService,
    VehicleService,
    UserService,
    LocationService,
    NotificationService,
    VoucherService,
    SettingsService
};

// ====================================
// Backward Compatible FirestoreService
// ====================================
// This maintains the original API for existing code

export const FirestoreService = {
    // ============ BOOKING ============
    addBooking: BookingService.addBooking.bind(BookingService),
    getUserBookings: BookingService.getUserBookings.bind(BookingService),
    subscribeToUserBookings: BookingService.subscribeToUserBookings.bind(BookingService),
    getBooking: BookingService.getBooking.bind(BookingService),
    getBookings: BookingService.getBookings.bind(BookingService),
    subscribeToAllBookings: BookingService.subscribeToAllBookings.bind(BookingService),
    updateBookingStatus: BookingService.updateBookingStatus.bind(BookingService),
    updatePaymentStatus: BookingService.updatePaymentStatus.bind(BookingService),
    assignDriver: BookingService.assignDriver.bind(BookingService),
    hasActiveBooking: BookingService.hasActiveBooking.bind(BookingService),
    getDriverBookings: BookingService.getDriverBookings.bind(BookingService),
    subscribeToDriverBookings: BookingService.subscribeToDriverBookings.bind(BookingService),
    getUserBookingStats: BookingService.getUserBookingStats.bind(BookingService),

    // Driver update with notification service injection
    async driverUpdateBookingStatus(
        bookingId: string,
        driverId: string,
        newStatus: 'driver_en_route' | 'in_progress' | 'completed',
        note?: string
    ): Promise<void> {
        await BookingService.driverUpdateBookingStatus(
            bookingId,
            driverId,
            newStatus as any,
            note,
            {
                addNotification: NotificationService.addNotification.bind(NotificationService)
            }
        );

        // If completed, update driver stats
        if (newStatus === 'completed') {
            await DriverService.incrementDriverTrips(driverId);
            await DriverService.updateDriverStatus(driverId, 'available' as any);
        }
    },

    // ============ VEHICLE ============
    getVehicles: VehicleService.getVehicles.bind(VehicleService),
    getVehicle: VehicleService.getVehicle.bind(VehicleService),
    addVehicle: VehicleService.addVehicle.bind(VehicleService),
    updateVehicle: VehicleService.updateVehicle.bind(VehicleService),
    deleteVehicle: VehicleService.deleteVehicle.bind(VehicleService),
    toggleLike: VehicleService.toggleLike.bind(VehicleService),
    rateVehicle: VehicleService.rateVehicle.bind(VehicleService),
    seedVehicles: VehicleService.seedVehicles.bind(VehicleService),

    // ============ USER ============
    getUser: UserService.getUser.bind(UserService),
    getUserById: UserService.getUserById.bind(UserService),
    createUser: UserService.createUser.bind(UserService),
    updateUserProfile: UserService.updateUserProfile.bind(UserService),
    updateUserRole: UserService.updateUserRole.bind(UserService),
    updateUserLanguage: UserService.updateUserLanguage.bind(UserService),
    getAllUsers: UserService.getAllUsers.bind(UserService),
    subscribeToAllUsers: UserService.subscribeToAllUsers.bind(UserService),
    toggleUserActive: UserService.toggleUserActive.bind(UserService),
    deleteUser: UserService.deleteUser.bind(UserService),
    updateUserPreferences: UserService.updateUserPreferences.bind(UserService),
    getUserPreferences: UserService.getUserPreferences.bind(UserService),
    getUserSavedLocations: UserService.getUserSavedLocations.bind(UserService),
    subscribeToUserSavedLocations: UserService.subscribeToUserSavedLocations.bind(UserService),
    addUserSavedLocation: UserService.addUserSavedLocation.bind(UserService),
    updateUserSavedLocation: UserService.updateUserSavedLocation.bind(UserService),
    deleteUserSavedLocation: UserService.deleteUserSavedLocation.bind(UserService),
    createDriverFromUser: UserService.createDriverFromUser.bind(UserService),
    getAllMembersWithDriverStatus: UserService.getAllMembersWithDriverStatus.bind(UserService),

    // ============ DRIVER ============
    getDrivers: DriverService.getDrivers.bind(DriverService),
    getAllDrivers: DriverService.getAllDrivers.bind(DriverService),
    subscribeToDrivers: DriverService.subscribeToDrivers.bind(DriverService),
    getDriver: DriverService.getDriver.bind(DriverService),
    getDriverById: DriverService.getDriverById.bind(DriverService),
    addDriver: DriverService.addDriver.bind(DriverService),
    updateDriver: DriverService.updateDriver.bind(DriverService),
    deleteDriver: DriverService.deleteDriver.bind(DriverService),
    updateDriverStatus: DriverService.updateDriverStatus.bind(DriverService),
    incrementDriverTrips: DriverService.incrementDriverTrips.bind(DriverService),
    getDriverByPhone: DriverService.getDriverByPhone.bind(DriverService),

    // ============ LOCATION ============
    getLocations: LocationService.getLocations.bind(LocationService),
    addLocation: LocationService.addLocation.bind(LocationService),
    updateLocation: LocationService.updateLocation.bind(LocationService),
    deleteLocation: LocationService.deleteLocation.bind(LocationService),
    seedLocations: LocationService.seedLocations.bind(LocationService),

    // ============ ROUTES ============
    getRoutes: LocationService.getRoutes.bind(LocationService),
    addRoute: LocationService.addRoute.bind(LocationService),
    updateRoute: LocationService.updateRoute.bind(LocationService),
    deleteRoute: LocationService.deleteRoute.bind(LocationService),
    seedRoutes: LocationService.seedRoutes.bind(LocationService),
    getRoutePrice: LocationService.getRoutePrice.bind(LocationService),

    // ============ NOTIFICATIONS ============
    getUserNotifications: NotificationService.getUserNotifications.bind(NotificationService),
    subscribeToUserNotifications: NotificationService.subscribeToUserNotifications.bind(NotificationService),
    addNotification: NotificationService.addNotification.bind(NotificationService),
    markNotificationAsRead: NotificationService.markNotificationAsRead.bind(NotificationService),
    markAllNotificationsAsRead: NotificationService.markAllNotificationsAsRead.bind(NotificationService),
    deleteNotification: NotificationService.deleteNotification.bind(NotificationService),
    clearAllNotifications: NotificationService.clearAllNotifications.bind(NotificationService),

    // ============ VOUCHERS ============
    getActiveVouchers: VoucherService.getActiveVouchers.bind(VoucherService),
    getUserVouchers: VoucherService.getUserVouchers.bind(VoucherService),
    subscribeToUserVouchers: VoucherService.subscribeToUserVouchers.bind(VoucherService),
    validateVoucher: VoucherService.validateVoucher.bind(VoucherService),
    assignVoucherToUser: VoucherService.assignVoucherToUser.bind(VoucherService),
    redeemVoucher: VoucherService.redeemVoucher.bind(VoucherService),
    createVoucher: VoucherService.createVoucher.bind(VoucherService),
    deleteVoucher: VoucherService.deleteVoucher.bind(VoucherService),

    // ============ SETTINGS ============
    getSettings: SettingsService.getSettings.bind(SettingsService),
    updateSettings: SettingsService.updateSettings.bind(SettingsService),
};
