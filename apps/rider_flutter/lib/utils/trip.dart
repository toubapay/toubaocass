import '../models.dart';

const _departingSoonHours = 3;
const _urgentHours = 2;

double hoursUntilDeparture(Trip trip) {
  final departsAt = DateTime.parse('${trip.departureDate}T${trip.departureTime}');
  return departsAt.difference(DateTime.now()).inSeconds / 3600;
}

bool isDepartingSoon(Trip trip) {
  final hours = hoursUntilDeparture(trip);
  return trip.status == 'scheduled' && hours >= 0 && hours <= _departingSoonHours;
}

enum BookingFillState { open, filling, full }

BookingFillState bookingFillState(Trip trip) {
  if (trip.availableSeats <= 0 || trip.status == 'full') return BookingFillState.full;
  if (trip.availableSeats < trip.totalSeats) return BookingFillState.filling;
  return BookingFillState.open;
}

const fillStateLabel = {
  BookingFillState.open: 'Disponible',
  BookingFillState.filling: 'Se remplit',
  BookingFillState.full: 'Complet',
};

const rideTypeLabel = {
  'standard': 'Standard',
  'comfort': 'Confort',
  'xl': 'XL',
};

/// Drives the always-visible trip urgency badge: departure within the next
/// 2 hours, or down to the last seat (0 seats already gets its own distinct
/// "no longer available" notice, so it's excluded here).
bool isUrgent(Trip trip) {
  if (trip.status != 'scheduled') return false;
  final hours = hoursUntilDeparture(trip);
  final departingUrgently = hours >= 0 && hours <= _urgentHours;
  final almostFull = trip.availableSeats > 0 && trip.availableSeats < 2;
  return departingUrgently || almostFull;
}
