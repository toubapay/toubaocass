import 'package:flutter_test/flutter_test.dart';
import 'package:rider_flutter/models.dart';
import 'package:rider_flutter/utils/trip.dart';

Trip _trip({required String status, required int availableSeats, required int totalSeats, DateTime? departsAt}) {
  final at = departsAt ?? DateTime.now().add(const Duration(hours: 6));
  return Trip(
    id: 1,
    driver: TripDriver(id: 1, name: 'Driver', phone: '+221700000000', rating: 5),
    car: null,
    originCity: null,
    destinationCity: null,
    departureLatitude: null,
    departureLongitude: null,
    departureAddress: null,
    departureDate: at.toIso8601String().substring(0, 10),
    departureTime: '${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}',
    fare: 5000,
    rideType: 'standard',
    totalSeats: totalSeats,
    availableSeats: availableSeats,
    status: status,
    notes: null,
    createdAt: '',
  );
}

void main() {
  group('isUrgent', () {
    test('is false for a normal scheduled trip', () {
      final trip = _trip(status: 'scheduled', availableSeats: 4, totalSeats: 4);
      expect(isUrgent(trip), isFalse);
    });

    test('is true when departing within 2 hours', () {
      final trip = _trip(
        status: 'scheduled',
        availableSeats: 4,
        totalSeats: 4,
        departsAt: DateTime.now().add(const Duration(hours: 1)),
      );
      expect(isUrgent(trip), isTrue);
    });

    test('is true when only 1 seat remains', () {
      final trip = _trip(status: 'scheduled', availableSeats: 1, totalSeats: 4);
      expect(isUrgent(trip), isTrue);
    });

    test('is false when the trip is not scheduled', () {
      final trip = _trip(
        status: 'cancelled',
        availableSeats: 1,
        totalSeats: 4,
        departsAt: DateTime.now().add(const Duration(minutes: 30)),
      );
      expect(isUrgent(trip), isFalse);
    });
  });

  group('bookingFillState', () {
    test('open when all seats are free', () {
      expect(bookingFillState(_trip(status: 'scheduled', availableSeats: 4, totalSeats: 4)),
          BookingFillState.open);
    });

    test('filling when some seats are booked', () {
      expect(bookingFillState(_trip(status: 'scheduled', availableSeats: 2, totalSeats: 4)),
          BookingFillState.filling);
    });

    test('full when no seats remain', () {
      expect(bookingFillState(_trip(status: 'scheduled', availableSeats: 0, totalSeats: 4)),
          BookingFillState.full);
    });
  });
}
