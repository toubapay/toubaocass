class DriverProfile {
  final int? id;
  final String? licenseNumber;
  final String? licenseExpiry;
  final String kycStatus;
  final String? kycRejectionReason;
  final double rating;
  final String? approvedAt;
  final bool isOnline;

  DriverProfile({
    required this.id,
    required this.licenseNumber,
    required this.licenseExpiry,
    required this.kycStatus,
    required this.kycRejectionReason,
    required this.rating,
    required this.approvedAt,
    this.isOnline = false,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) => DriverProfile(
        id: json['id'] as int?,
        licenseNumber: json['license_number'] as String?,
        licenseExpiry: json['license_expiry'] as String?,
        kycStatus: json['kyc_status'] as String? ?? 'pending',
        kycRejectionReason: json['kyc_rejection_reason'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
        approvedAt: json['approved_at'] as String?,
        isOnline: json['is_online'] as bool? ?? false,
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

  User copyWith({DriverProfile? driverProfile}) => User(
        id: id,
        name: name,
        phone: phone,
        email: email,
        role: role,
        phoneVerified: phoneVerified,
        profileComplete: profileComplete,
        driverProfile: driverProfile ?? this.driverProfile,
        createdAt: createdAt,
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
  });

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
  final String paymentMethod;
  final String status;
  final String createdAt;

  Booking({
    required this.id,
    required this.trip,
    required this.rider,
    required this.seatsBooked,
    required this.fareTotal,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
        id: json['id'] as int,
        trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
        rider: BookingRider.fromJson(json['rider'] as Map<String, dynamic>),
        seatsBooked: json['seats_booked'] as int,
        fareTotal: json['fare_total'] as int,
        paymentMethod: json['payment_method'] as String? ?? 'cash',
        status: json['status'] as String,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class WalletTransaction {
  final int id;
  final String type;
  final int amount;
  final int? bookingId;
  final String? description;
  final String createdAt;

  WalletTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.bookingId,
    required this.description,
    required this.createdAt,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) => WalletTransaction(
        id: json['id'] as int,
        type: json['type'] as String,
        amount: json['amount'] as int,
        bookingId: json['booking_id'] as int?,
        description: json['description'] as String?,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class Wallet {
  final int id;
  final int balance;
  final List<WalletTransaction> transactions;

  Wallet({required this.id, required this.balance, required this.transactions});

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        id: json['id'] as int,
        balance: json['balance'] as int,
        transactions: (json['transactions'] as List? ?? [])
            .map((e) => WalletTransaction.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Address {
  final int id;
  final String label;
  final String addressLine;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  Address({
    required this.id,
    required this.label,
    required this.addressLine,
    required this.latitude,
    required this.longitude,
    required this.isDefault,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'] as int,
        label: json['label'] as String,
        addressLine: json['address_line'] as String,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        isDefault: json['is_default'] as bool? ?? false,
      );
}

class Message {
  final int id;
  final int bookingId;
  final String body;
  final int senderId;
  final String? senderName;
  final bool isMine;
  final String? readAt;
  final String createdAt;

  Message({
    required this.id,
    required this.bookingId,
    required this.body,
    required this.senderId,
    required this.senderName,
    required this.isMine,
    required this.readAt,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as int,
        bookingId: json['booking_id'] as int,
        body: json['body'] as String,
        senderId: json['sender_id'] as int,
        senderName: json['sender_name'] as String?,
        isMine: json['is_mine'] as bool,
        readAt: json['read_at'] as String?,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class ScannedVehicleInfo {
  final String? make;
  final String? model;
  final String? plateNumber;
  final int? powerCv;
  final int? seats;
  final String? vehicleAgeBracket;
  final String? carteGriseFrontPath;
  final String? carteGriseBackPath;

  ScannedVehicleInfo({
    required this.make,
    required this.model,
    required this.plateNumber,
    required this.powerCv,
    required this.seats,
    required this.vehicleAgeBracket,
    required this.carteGriseFrontPath,
    required this.carteGriseBackPath,
  });

  factory ScannedVehicleInfo.fromJson(Map<String, dynamic> json) => ScannedVehicleInfo(
        make: json['make'] as String?,
        model: json['model'] as String?,
        plateNumber: json['plate_number'] as String?,
        powerCv: json['power_cv'] as int?,
        seats: json['seats'] as int?,
        vehicleAgeBracket: json['vehicle_age_bracket'] as String?,
        carteGriseFrontPath: json['carte_grise_front_path'] as String?,
        carteGriseBackPath: json['carte_grise_back_path'] as String?,
      );
}

class InsuranceQuote {
  final int providerId;
  final String providerName;
  final String planName;
  final String coverageType;
  final int annualPremium;
  final int monthlyPremium;
  final List<String> highlights;

  InsuranceQuote({
    required this.providerId,
    required this.providerName,
    required this.planName,
    required this.coverageType,
    required this.annualPremium,
    required this.monthlyPremium,
    required this.highlights,
  });

  factory InsuranceQuote.fromJson(Map<String, dynamic> json) => InsuranceQuote(
        providerId: json['provider_id'] as int,
        providerName: json['provider_name'] as String,
        planName: json['plan_name'] as String,
        coverageType: json['coverage_type'] as String,
        annualPremium: json['annual_premium'] as int,
        monthlyPremium: json['monthly_premium'] as int,
        highlights: (json['highlights'] as List? ?? []).map((e) => e.toString()).toList(),
      );
}

class InsuredVehicleSummary {
  final String? make;
  final String? model;
  final String? plateNumber;

  InsuredVehicleSummary({required this.make, required this.model, required this.plateNumber});

  factory InsuredVehicleSummary.fromJson(Map<String, dynamic> json) => InsuredVehicleSummary(
        make: json['make'] as String?,
        model: json['model'] as String?,
        plateNumber: json['plate_number'] as String?,
      );
}

class InsurancePolicy {
  final int id;
  final InsuredVehicleSummary car;
  final String providerName;
  final String coverageType;
  final String planName;
  final int annualPremium;
  final String policyNumber;
  final String startsAt;
  final String endsAt;
  final String status;
  final bool isActive;

  InsurancePolicy({
    required this.id,
    required this.car,
    required this.providerName,
    required this.coverageType,
    required this.planName,
    required this.annualPremium,
    required this.policyNumber,
    required this.startsAt,
    required this.endsAt,
    required this.status,
    required this.isActive,
  });

  factory InsurancePolicy.fromJson(Map<String, dynamic> json) => InsurancePolicy(
        id: json['id'] as int,
        car: InsuredVehicleSummary.fromJson(json['car'] as Map<String, dynamic>? ?? {}),
        providerName: (json['provider'] as Map<String, dynamic>?)?['name'] as String? ?? '',
        coverageType: json['coverage_type'] as String,
        planName: json['plan_name'] as String,
        annualPremium: json['annual_premium'] as int,
        policyNumber: json['policy_number'] as String,
        startsAt: json['starts_at'] as String? ?? '',
        endsAt: json['ends_at'] as String? ?? '',
        status: json['status'] as String,
        isActive: json['is_active'] as bool? ?? false,
      );
}

class DeliveryParty {
  final int id;
  final String? name;
  final String phone;
  final double? rating;

  DeliveryParty({required this.id, required this.name, required this.phone, this.rating});

  factory DeliveryParty.fromJson(Map<String, dynamic> json) => DeliveryParty(
        id: json['id'] as int,
        name: json['name'] as String?,
        phone: json['phone'] as String,
        rating: (json['rating'] as num?)?.toDouble(),
      );
}

class Delivery {
  final int id;
  final DeliveryParty sender;
  final DeliveryParty? driver;
  final String receiverName;
  final String receiverPhone;
  final String receiverAddressLine;
  final double receiverLatitude;
  final double receiverLongitude;
  final String pickupAddressLine;
  final double pickupLatitude;
  final double pickupLongitude;
  final double? currentLatitude;
  final double? currentLongitude;
  final String? currentLocationUpdatedAt;
  final String packageType;
  final String? notes;
  final double distanceKm;
  final int fee;
  final String paymentMethod;
  final String status;
  final String? acceptedAt;
  final String? pickedUpAt;
  final String? deliveredAt;
  final String? cancelledAt;
  final String createdAt;

  Delivery({
    required this.id,
    required this.sender,
    required this.driver,
    required this.receiverName,
    required this.receiverPhone,
    required this.receiverAddressLine,
    required this.receiverLatitude,
    required this.receiverLongitude,
    required this.pickupAddressLine,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.currentLatitude,
    required this.currentLongitude,
    required this.currentLocationUpdatedAt,
    required this.packageType,
    required this.notes,
    required this.distanceKm,
    required this.fee,
    required this.paymentMethod,
    required this.status,
    required this.acceptedAt,
    required this.pickedUpAt,
    required this.deliveredAt,
    required this.cancelledAt,
    required this.createdAt,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) => Delivery(
        id: json['id'] as int,
        sender: DeliveryParty.fromJson(json['sender'] as Map<String, dynamic>),
        driver: json['driver'] == null ? null : DeliveryParty.fromJson(json['driver'] as Map<String, dynamic>),
        receiverName: json['receiver_name'] as String,
        receiverPhone: json['receiver_phone'] as String,
        receiverAddressLine: json['receiver_address_line'] as String,
        receiverLatitude: (json['receiver_latitude'] as num).toDouble(),
        receiverLongitude: (json['receiver_longitude'] as num).toDouble(),
        pickupAddressLine: json['pickup_address_line'] as String,
        pickupLatitude: (json['pickup_latitude'] as num).toDouble(),
        pickupLongitude: (json['pickup_longitude'] as num).toDouble(),
        currentLatitude: (json['current_latitude'] as num?)?.toDouble(),
        currentLongitude: (json['current_longitude'] as num?)?.toDouble(),
        currentLocationUpdatedAt: json['current_location_updated_at'] as String?,
        packageType: json['package_type'] as String,
        notes: json['notes'] as String?,
        distanceKm: (json['distance_km'] as num).toDouble(),
        fee: json['fee'] as int,
        paymentMethod: json['payment_method'] as String? ?? 'cash',
        status: json['status'] as String,
        acceptedAt: json['accepted_at'] as String?,
        pickedUpAt: json['picked_up_at'] as String?,
        deliveredAt: json['delivered_at'] as String?,
        cancelledAt: json['cancelled_at'] as String?,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class AnandoPoster {
  final int id;
  final String? name;
  final String phone;
  final String role;
  final double? anandoRating;
  final int anandoRatingsCount;

  AnandoPoster({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.anandoRating,
    required this.anandoRatingsCount,
  });

  factory AnandoPoster.fromJson(Map<String, dynamic> json) => AnandoPoster(
        id: json['id'] as int,
        name: json['name'] as String?,
        phone: json['phone'] as String,
        role: json['role'] as String? ?? '',
        anandoRating: (json['anando_rating'] as num?)?.toDouble(),
        anandoRatingsCount: json['anando_ratings_count'] as int? ?? 0,
      );
}

class AnandoMyBooking {
  final int id;
  final int seatsBooked;
  final int priceTotal;
  final String paymentMethod;
  final String status;

  AnandoMyBooking({
    required this.id,
    required this.seatsBooked,
    required this.priceTotal,
    required this.paymentMethod,
    required this.status,
  });

  factory AnandoMyBooking.fromJson(Map<String, dynamic> json) => AnandoMyBooking(
        id: json['id'] as int,
        seatsBooked: json['seats_booked'] as int,
        priceTotal: json['price_total'] as int,
        paymentMethod: json['payment_method'] as String? ?? 'cash',
        status: json['status'] as String,
      );
}

class AnandoRating {
  final int rateeId;
  final int score;
  final String? comment;

  AnandoRating({required this.rateeId, required this.score, required this.comment});

  factory AnandoRating.fromJson(Map<String, dynamic> json) => AnandoRating(
        rateeId: json['ratee_id'] as int,
        score: json['score'] as int,
        comment: json['comment'] as String?,
      );
}

class AnandoRide {
  final int id;
  final AnandoPoster poster;
  final City? originCity;
  final City? destinationCity;
  final double? routeDistanceKm;
  final int? routeDurationMinutes;
  final String? departurePoint;
  final double? departureLatitude;
  final double? departureLongitude;
  final String departureAt;
  final String? startedAt;
  final double? currentLatitude;
  final double? currentLongitude;
  final String? currentLocationUpdatedAt;
  final int pricePerSeat;
  final int totalSeats;
  final int availableSeats;
  final String? vehicleInfo;
  final String? notes;
  final String status;
  final bool isJoinable;
  final bool isMine;
  final String createdAt;
  final List<AnandoRideBooking>? bookings;
  final AnandoMyBooking? myBooking;
  final List<AnandoRating>? myRatingsGiven;

  AnandoRide({
    required this.id,
    required this.poster,
    required this.originCity,
    required this.destinationCity,
    required this.routeDistanceKm,
    required this.routeDurationMinutes,
    required this.departurePoint,
    required this.departureLatitude,
    required this.departureLongitude,
    required this.departureAt,
    required this.startedAt,
    required this.currentLatitude,
    required this.currentLongitude,
    required this.currentLocationUpdatedAt,
    required this.pricePerSeat,
    required this.totalSeats,
    required this.availableSeats,
    required this.vehicleInfo,
    required this.notes,
    required this.status,
    required this.isJoinable,
    required this.isMine,
    required this.createdAt,
    this.bookings,
    this.myBooking,
    this.myRatingsGiven,
  });

  factory AnandoRide.fromJson(Map<String, dynamic> json) => AnandoRide(
        id: json['id'] as int,
        poster: AnandoPoster.fromJson(json['poster'] as Map<String, dynamic>),
        originCity: json['origin_city'] == null ? null : City.fromJson(json['origin_city'] as Map<String, dynamic>),
        destinationCity:
            json['destination_city'] == null ? null : City.fromJson(json['destination_city'] as Map<String, dynamic>),
        routeDistanceKm: (json['route_distance_km'] as num?)?.toDouble(),
        routeDurationMinutes: json['route_duration_minutes'] as int?,
        departurePoint: json['departure_point'] as String?,
        departureLatitude: (json['departure_latitude'] as num?)?.toDouble(),
        departureLongitude: (json['departure_longitude'] as num?)?.toDouble(),
        departureAt: json['departure_at'] as String? ?? '',
        startedAt: json['started_at'] as String?,
        currentLatitude: (json['current_latitude'] as num?)?.toDouble(),
        currentLongitude: (json['current_longitude'] as num?)?.toDouble(),
        currentLocationUpdatedAt: json['current_location_updated_at'] as String?,
        pricePerSeat: json['price_per_seat'] as int,
        totalSeats: json['total_seats'] as int,
        availableSeats: json['available_seats'] as int,
        vehicleInfo: json['vehicle_info'] as String?,
        notes: json['notes'] as String?,
        status: json['status'] as String,
        isJoinable: json['is_joinable'] as bool? ?? false,
        isMine: json['is_mine'] as bool? ?? false,
        createdAt: json['created_at'] as String? ?? '',
        bookings: json['bookings'] == null
            ? null
            : (json['bookings'] as List).map((e) => AnandoRideBooking.fromJson(e as Map<String, dynamic>)).toList(),
        myBooking: json['my_booking'] == null ? null : AnandoMyBooking.fromJson(json['my_booking'] as Map<String, dynamic>),
        myRatingsGiven: json['my_ratings_given'] == null
            ? null
            : (json['my_ratings_given'] as List).map((e) => AnandoRating.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class AnandoRideBooking {
  final int id;
  final AnandoRide anandoRide;
  final AnandoPoster user;
  final int seatsBooked;
  final int priceTotal;
  final String paymentMethod;
  final String status;
  final String createdAt;

  AnandoRideBooking({
    required this.id,
    required this.anandoRide,
    required this.user,
    required this.seatsBooked,
    required this.priceTotal,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });

  factory AnandoRideBooking.fromJson(Map<String, dynamic> json) => AnandoRideBooking(
        id: json['id'] as int,
        anandoRide: AnandoRide.fromJson(json['anando_ride'] as Map<String, dynamic>),
        user: AnandoPoster.fromJson({...json['user'] as Map<String, dynamic>, 'role': ''}),
        seatsBooked: json['seats_booked'] as int,
        priceTotal: json['price_total'] as int,
        paymentMethod: json['payment_method'] as String? ?? 'cash',
        status: json['status'] as String,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class DemLeguiRequest {
  final int id;
  final BookingRider rider;
  final double pickupLatitude;
  final double pickupLongitude;
  final String? pickupAddress;
  final City? destinationCity;
  final String? destinationAddress;
  final int seatsRequested;
  final int fareTotal;
  final String paymentMethod;
  final String status;
  final int? demLeguiTripId;
  final String createdAt;

  DemLeguiRequest({
    required this.id,
    required this.rider,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.pickupAddress,
    required this.destinationCity,
    required this.destinationAddress,
    required this.seatsRequested,
    required this.fareTotal,
    required this.paymentMethod,
    required this.status,
    required this.demLeguiTripId,
    required this.createdAt,
  });

  factory DemLeguiRequest.fromJson(Map<String, dynamic> json) => DemLeguiRequest(
        id: json['id'] as int,
        rider: BookingRider.fromJson(json['rider'] as Map<String, dynamic>),
        pickupLatitude: (json['pickup_latitude'] as num).toDouble(),
        pickupLongitude: (json['pickup_longitude'] as num).toDouble(),
        pickupAddress: json['pickup_address'] as String?,
        destinationCity:
            json['destination_city'] == null ? null : City.fromJson(json['destination_city'] as Map<String, dynamic>),
        destinationAddress: json['destination_address'] as String?,
        seatsRequested: json['seats_requested'] as int,
        fareTotal: json['fare_total'] as int,
        paymentMethod: json['payment_method'] as String? ?? 'cash',
        status: json['status'] as String,
        demLeguiTripId: json['dem_legui_trip_id'] as int?,
        createdAt: json['created_at'] as String? ?? '',
      );
}

class DemLeguiTrip {
  final int id;
  final TripDriver driver;
  final Car? car;
  final City? destinationCity;
  final int totalSeats;
  final int availableSeats;
  final int pricePerSeat;
  final String status;
  final String? startedAt;
  final String? completedAt;
  final double? currentLatitude;
  final double? currentLongitude;
  final String? currentLocationUpdatedAt;
  final String? arrivedAt;
  final String createdAt;
  final List<DemLeguiRequest>? requests;

  DemLeguiTrip({
    required this.id,
    required this.driver,
    required this.car,
    required this.destinationCity,
    required this.totalSeats,
    required this.availableSeats,
    required this.pricePerSeat,
    required this.status,
    required this.startedAt,
    required this.completedAt,
    required this.currentLatitude,
    required this.currentLongitude,
    required this.currentLocationUpdatedAt,
    required this.arrivedAt,
    required this.createdAt,
    this.requests,
  });

  factory DemLeguiTrip.fromJson(Map<String, dynamic> json) => DemLeguiTrip(
        id: json['id'] as int,
        driver: TripDriver.fromJson(json['driver'] as Map<String, dynamic>),
        car: json['car'] == null ? null : Car.fromJson(json['car'] as Map<String, dynamic>),
        destinationCity:
            json['destination_city'] == null ? null : City.fromJson(json['destination_city'] as Map<String, dynamic>),
        totalSeats: json['total_seats'] as int,
        availableSeats: json['available_seats'] as int,
        pricePerSeat: json['price_per_seat'] as int,
        status: json['status'] as String,
        startedAt: json['started_at'] as String?,
        completedAt: json['completed_at'] as String?,
        currentLatitude: (json['current_latitude'] as num?)?.toDouble(),
        currentLongitude: (json['current_longitude'] as num?)?.toDouble(),
        currentLocationUpdatedAt: json['current_location_updated_at'] as String?,
        arrivedAt: json['arrived_at'] as String?,
        createdAt: json['created_at'] as String? ?? '',
        requests: json['requests'] == null
            ? null
            : (json['requests'] as List).map((e) => DemLeguiRequest.fromJson(e as Map<String, dynamic>)).toList(),
      );
}
