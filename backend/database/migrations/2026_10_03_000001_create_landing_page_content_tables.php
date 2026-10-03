<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_slides', function (Blueprint $table) {
            $table->id();
            $table->string('emoji', 16)->default('🚌');
            $table->string('eyebrow_fr');
            $table->string('eyebrow_ar');
            $table->string('title_fr');
            $table->string('title_ar');
            $table->text('subtitle_fr');
            $table->text('subtitle_ar');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('landing_services', function (Blueprint $table) {
            $table->id();
            $table->string('icon', 16)->default('🚌');
            $table->string('title_fr');
            $table->string('title_ar');
            $table->text('description_fr');
            $table->text('description_ar');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('landing_trust_items', function (Blueprint $table) {
            $table->id();
            $table->string('icon', 16)->default('⭐');
            $table->string('text_fr');
            $table->string('text_ar');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('landing_steps', function (Blueprint $table) {
            $table->id();
            $table->string('title_fr');
            $table->string('title_ar');
            $table->text('description_fr');
            $table->text('description_ar');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed with the content the landing page already ships with, so
        // turning this feature on doesn't change anything until an admin
        // actually edits it.
        $now = now();

        DB::table('landing_slides')->insert([
            ['emoji' => '🚌', 'eyebrow_fr' => 'Trajets Intercity', 'eyebrow_ar' => 'رحلات بين المدن', 'title_fr' => 'Voyagez entre les villes en toute sérénité', 'title_ar' => 'سافر بين المدن براحة واطمئنان', 'subtitle_fr' => "Réservez une place dans un trajet partagé entre conducteurs et passagers, à l'heure et au prix qui vous conviennent.", 'subtitle_ar' => 'احجز مقعدًا في رحلة مشتركة بين السائقين والركاب، في الوقت والسعر الذي يناسبك.', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['emoji' => '🚕', 'eyebrow_fr' => 'Dem Légui', 'eyebrow_ar' => 'Dem Légui', 'title_fr' => 'Une course à la demande en quelques secondes', 'title_ar' => 'رحلة عند الطلب في ثوانٍ معدودة', 'subtitle_fr' => 'Indiquez où vous êtes et où vous allez — un conducteur en ligne à proximité accepte votre demande.', 'subtitle_ar' => 'حدد مكانك ووجهتك — وسيقبل طلبك سائق متصل قريب منك.', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['emoji' => '📦', 'eyebrow_fr' => 'Livraison', 'eyebrow_ar' => 'التوصيل', 'title_fr' => 'Envoyez un colis, où que vous soyez', 'title_ar' => 'أرسل طردًا أينما كنت', 'subtitle_fr' => "Faites livrer un colis en ville ou entre villes, suivi en direct jusqu'à la remise.", 'subtitle_ar' => 'وصّل طردًا داخل المدينة أو بين المدن، مع تتبع مباشر حتى التسليم.', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['emoji' => '🚗', 'eyebrow_fr' => 'Anando', 'eyebrow_ar' => 'Anando', 'title_fr' => 'Partagez un trajet instantané', 'title_ar' => 'شارك رحلة فورية', 'subtitle_fr' => 'Comme du covoiturage : publiez ou rejoignez un trajet qui part maintenant.', 'subtitle_ar' => 'مثل التنقل المشترك: انشر رحلة تنطلق الآن أو انضم إلى واحدة.', 'sort_order' => 4, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        DB::table('landing_services')->insert([
            ['icon' => '🚌', 'title_fr' => 'Trajets Intercity', 'title_ar' => 'رحلات بين المدن', 'description_fr' => 'Réservez une place dans un trajet intercity partagé, économique et confortable.', 'description_ar' => 'احجز مقعدًا في رحلة مشتركة بين المدن، اقتصادية ومريحة.', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🚕', 'title_fr' => 'Dem Légui', 'title_ar' => 'Dem Légui', 'description_fr' => 'Demandez une course maintenant, comme un taxi à la demande.', 'description_ar' => 'اطلب رحلة الآن، تمامًا مثل سيارة أجرة عند الطلب.', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🚗', 'title_fr' => 'Anando', 'title_ar' => 'Anando', 'description_fr' => 'Partagez ou trouvez un trajet instantané, comme du covoiturage.', 'description_ar' => 'شارك رحلة فورية أو ابحث عن واحدة، مثل التنقل المشترك.', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '📦', 'title_fr' => 'Livraison', 'title_ar' => 'التوصيل', 'description_fr' => 'Envoi de colis en ville et entre villes, suivi en direct.', 'description_ar' => 'إرسال الطرود داخل المدينة وبين المدن، مع تتبع مباشر.', 'sort_order' => 4, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🛳️', 'title_fr' => 'Cargaison', 'title_ar' => 'الشحن', 'description_fr' => 'Transport de marchandises en gros volume.', 'description_ar' => 'نقل البضائع بكميات كبيرة.', 'sort_order' => 5, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🚛', 'title_fr' => 'Camion', 'title_ar' => 'الشاحنة', 'description_fr' => 'Déménagement et transport de gros objets.', 'description_ar' => 'نقل الأثاث والأغراض الكبيرة.', 'sort_order' => 6, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🔑', 'title_fr' => 'Location', 'title_ar' => 'الإيجار', 'description_fr' => 'Location de véhicules avec ou sans chauffeur.', 'description_ar' => 'تأجير المركبات مع سائق أو بدونه.', 'sort_order' => 7, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        DB::table('landing_trust_items')->insert([
            ['icon' => '💳', 'text_fr' => 'Paiement en espèces ou par portefeuille mobile', 'text_ar' => 'الدفع نقدًا أو عبر المحفظة الإلكترونية', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '📍', 'text_fr' => 'Suivi en direct de chaque trajet', 'text_ar' => 'تتبع مباشر لكل رحلة', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '⭐', 'text_fr' => 'Conducteurs notés par la communauté', 'text_ar' => 'سائقون مقيّمون من طرف المجتمع', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['icon' => '🆘', 'text_fr' => 'Partage de position en cas de besoin', 'text_ar' => 'مشاركة الموقع عند الحاجة', 'sort_order' => 4, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        DB::table('landing_steps')->insert([
            ['title_fr' => 'Choisissez un service', 'title_ar' => 'اختر خدمة', 'description_fr' => "Trajet intercity, course à la demande, livraison ou covoiturage instantané : indiquez simplement où vous allez.", 'description_ar' => 'رحلة بين المدن، طلب سيارة أجرة، توصيل أو تنقل مشترك فوري: فقط حدد وجهتك.', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['title_fr' => 'Réservez en quelques clics', 'title_ar' => 'احجز ببضع نقرات فقط', 'description_fr' => 'Comparez les options disponibles, choisissez votre mode de paiement et confirmez.', 'description_ar' => 'قارن الخيارات المتاحة، اختر طريقة الدفع، وأكّد حجزك.', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['title_fr' => 'Voyagez en toute confiance', 'title_ar' => 'سافر بكل ثقة', 'description_fr' => "Suivez votre trajet en direct et restez en contact avec votre conducteur jusqu'à l'arrivée.", 'description_ar' => 'تتبّع رحلتك مباشرة وابقَ على تواصل مع سائقك حتى الوصول.', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_steps');
        Schema::dropIfExists('landing_trust_items');
        Schema::dropIfExists('landing_services');
        Schema::dropIfExists('landing_slides');
    }
};
