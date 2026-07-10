class DriverProfile {
  final int? id;
  final String? licenseNumber;
  final String? licenseExpiry;
  final String kycStatus;
  final String? kycRejectionReason;
  final double rating;
  final String? approvedAt;

  DriverProfile({
    required this.id,
    required this.licenseNumber,
    required this.licenseExpiry,
    required this.kycStatus,
    required this.kycRejectionReason,
    required this.rating,
    required this.approvedAt,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) => DriverProfile(
        id: json['id'] as int?,
        licenseNumber: json['license_number'] as String?,
        licenseExpiry: json['license_expiry'] as String?,
        kycStatus: json['kyc_status'] as String? ?? 'pending',
        kycRejectionReason: json['kyc_rejection_reason'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
        approvedAt: json['approved_at'] as String?,
      );
}

class User {
  final int id;
  final String? name;
  final String phone;
  final String? email;
  final String role;
  final bool phoneVerified;
  final bool profileComplete;
  final DriverProfile? driverProfile;
  final String createdAt;

  User({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.role,
    required this.phoneVerified,
    required this.profileComplete,
    required this.driverProfile,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as int,
        name: json['name'] as String?,
        phone: json['phone'] as String,
        email: json['email'] as String?,
        role: json['role'] as String,
        phoneVerified: json['phone_verified'] as bool? ?? false,
        profileComplete: json['profile_complete'] as bool? ?? false,
        driverProfile: json['driver_profile'] == null
            ? null
            : DriverProfile.fromJson(json['driver_profile'] as Map<String, dynamic>),
        createdAt: json['created_at'] as String? ?? '',
      );
}

class City {
  final int id;
  final String name;
  final String country;

  City({required this.id, required this.name, required this.country});

  factory City.fromJson(Map<String, dynamic> json) => City(
        id: json['id'] as int,
        name: json['name'] as String,
        country: json['country'] as String? ?? '',
      );
}

class Car {
  final int id;
  final String type;
  final String make;
  final String model;
  final int? year;
  final String? color;
  final String plateNumber;
  final int seats;
  final String? photoUrl;
  final bool isActive;

  Car({
    required this.id,
    required this.type,
    required this.make,
    required this.model,
    required this.year,
    required this.color,
    required this.plateNumber,
    required this.seats,
    required this.photoUrl,
    required this.isActive,
  });

  factory Car.fromJson(Map<String, dynamic> json) => Car(
        id: json['id'] as int,
        type: json['type'] as String,
        make: json['make'] as String,
        model: json['model'] as String,
        year: json['year'] as int?,
        color: json['color'] as String?,
        plateNumber: json['plate_number'] as String,
        seats: json['seats'] as int,
        photoUrl: json['photo_url'] as String?,
        isActive: json['is_active'] as bool? ?? true,
      );
}

class TripDriver {
  final int id;
  final String? name;
  final String phone;
  final double rating;

  TripDriver({required this.id, required this.name, required this.phone, required this.rating});

  factory TripDriver.fromJson(Map<String, dynamic> json) => TripDriver(
        id: json['id'] as int,
        name: json['name'] as String?,
        phone: json['phone'] as String,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
      );
}

class RiderBookingSummary {
  final int id;
  final int seatsBooked;
  final int fareTotal;
  final String status;

  RiderBookingSummary({required this.id, required this.seatsBooked, required this.fareTotal, required this.status});

  factory RiderBookingSummary.fromJson(Map<String, dynamic> json) => RiderBookingSummary(
        id: json['id'] as int,
        seatsBooked: json['seats_booked'] as int,
        fareTotal: json['fare_total'] as int,
        status: json['status'] as String,
      );
}

class Trip {
  final int id;
  final TripDriver driver;
  final Car? car;
  final City? originCity;
  final City? destinationCity;
  final double? departureLatitude;
  final double? departureLongitude;
  final String? departureAddress;
  final String departureDate;
  final String departureTime;
  final int fare;
  final String rideType;
  final int totalSeats;
  final int availableSeats;
  final String status;
  final String? notes;
  final String createdAt;
  final double? distanceKm;
  final List<Booking>? bookings;
  final int? bookingsCount;
  final RiderBookingSummary? myBooking;

  Trip({
    required this.id,
    required this.driver,
    required this.car,
    required this.originCity,
    required this.destinationCity,
    required this.departureLatitude,
    required this.departureLongitude,
    required this.departureAddress,
    required this.departureDate,
    required this.departureTime,
    required this.fare,
    required this.rideType,
    required this.totalSeats,
    required this.availableSeats,
    required this.status,
    required this.notes,
    required this.createdAt,
    this.distanceKm,
    this.bookings,
    this.bookingsCount,
    this.myBooking,
  });

  Trip copyWithMyBooking(RiderBookingSummary? myBooking) => Trip(
        id: id,
        driver: driver,
        car: car,
        originCity: originCity,
        destinationCity: destinationCity,
        departureLatitude: departureLatitude,
        departureLongitude: departureLongitude,
        departureAddress: departureAddress,
        departureDate: departureDate,
        departureTime: departureTime,
        fare: fare,
        rideType: rideType,
        totalSeats: totalSeats,
        availableSeats: availableSeats,
        status: status,
        notes: notes,
        createdAt: createdAt,
        distanceKm: distanceKm,
        bookings: bookings,
        bookingsCount: bookingsCount,
        myBooking: myBooking,
      );

  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
        id: json['id'] as int,
        driver: TripDriver.fromJson(json['driver'] as Map<String, dynamic>),
        car: json['car'] == null ? null : Car.fromJson(json['car'] as Map<String, dynamic>),
        originCity: json['origin_city'] == null ? null : City.fromJson(json['origin_city'] as Map<String, dynamic>),
        destinationCity:
            json['destination_city'] == null ? null : City.fromJson(json['destination_city'] as Map<String, dynamic>),
        departureLatitude: (json['departure_latitude'] as num?)?.toDouble(),
        departureLongitude: (json['departure_longitude'] as num?)?.toDouble(),
        departureAddress: json['departure_address'] as String?,
        departureDate: json['departure_date'] as String,
        departureTime: json['departure_time'] as String,
        fare: json['fare'] as int,
        rideType: json['ride_type'] as String,
        totalSeats: json['total_seats'] as int,
        availableSeats: json['available_seats'] as int,
        status: json['status'] as String,
        notes: json['notes'] as String?,
        createdAt: json['created_at'] as String? ?? '',
        distanceKm: (json['distance_km'] as num?)?.toDouble(),
        bookings: json['bookings'] == null
            ? null
            : (json['bookings'] as List).map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList(),
        bookingsCount: json['bookings_count'] as int?,
        myBooking: json['my_booking'] == null
            ? null
            : RiderBookingSummary.fromJson(json['my_booking'] as Map<String, dynamic>),
      );
}

class BookingRider {
  final int id;
  final String? name;
  final String phone;

  BookingRider({required this.id, required this.name, required this.phone});

  factory BookingRider.fromJson(Map<String, dynamic> json) =>
      BookingRider(id: json['id'] as int, name: json['name'] as String?, phone: json['phone'] as String);
}

class Booking {
  final int id;
  final Trip trip;
  final BookingRider rider;
  final int seatsBooked;
  final int fareTotal;
  final String status;
  final String createdAt;

  Booking({
    required this.id,
    required this.trip,
    required this.rider,
    required this.seatsBooked,
    required this.fareTotal,
    required this.status,
    required this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
        id: json['id'] as int,
        trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
        rider: BookingRider.fromJson(json['rider'] as Map<String, dynamic>),
        seatsBooked: json['seats_booked'] as int,
        fareTotal: json['fare_total'] as int,
        status: json['status'] as String,
        createdAt: json['created_at'] as String? ?? '',
      );
}
