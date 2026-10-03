<?php

namespace App\Services;

use App\Models\AdminUser;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Branding + global copy for the public /lending marketing page, stored as
 * one JSON blob under a single PlatformSetting key (mirrors how fares/KYC
 * mode are stored) — unlike the slides/services/trust-items/steps, these
 * are singleton fields with no reason to live in their own rows. Defaults
 * match whatever the page shipped with before this became admin-editable,
 * so turning the feature on changes nothing until an admin edits it.
 */
class LandingPageSettingsService
{
    public const SETTING_KEY = 'landing_page.settings';

    public const LOGO_DISK = 'public';

    public const LOGO_DIRECTORY = 'landing-page';

    private const DEFAULTS = [
        'brand_name' => 'Intercity',
        'logo_path' => null,
        'primary_color' => '#8A6708',
        'primary_dark_color' => '#6B4F06',
        'accent_color' => '#2F6A8A',
        'nav_links' => [
            ['label_fr' => 'Services', 'label_ar' => 'الخدمات', 'href' => '#services'],
            ['label_fr' => 'Comment ça marche', 'label_ar' => 'كيف يعمل', 'href' => '#comment-ca-marche'],
            ['label_fr' => 'Contact', 'label_ar' => 'اتصل بنا', 'href' => '#contact'],
        ],
        'open_app_label_fr' => "Ouvrir l'application",
        'open_app_label_ar' => 'افتح التطبيق',
        'hero_cta_primary_fr' => 'Commencer maintenant',
        'hero_cta_primary_ar' => 'ابدأ الآن',
        'hero_cta_secondary_fr' => 'Découvrir les services',
        'hero_cta_secondary_ar' => 'اكتشف الخدمات',
        'final_cta_title_fr' => 'Prêt à prendre la route ?',
        'final_cta_title_ar' => 'مستعد لتبدأ رحلتك؟',
        'final_cta_subtitle_fr' => 'Créez votre compte en quelques instants et réservez votre premier trajet dès aujourd\'hui.',
        'final_cta_subtitle_ar' => 'أنشئ حسابك في لحظات واحجز رحلتك الأولى اليوم.',
        'final_cta_button_fr' => 'Créer un compte',
        'final_cta_button_ar' => 'إنشاء حساب',
        'footer_blurb_fr' => 'Une plateforme de mobilité et de livraison qui connecte conducteurs et passagers pour des trajets intercity, des courses à la demande, du covoiturage instantané et l\'envoi de colis.',
        'footer_blurb_ar' => 'منصة للتنقل والتوصيل تربط السائقين بالركاب من أجل رحلات بين المدن، وطلب سيارات الأجرة، والتنقل المشترك الفوري، وإرسال الطرود.',
        'footer_company_fr' => 'Promobile Sénégal',
        'footer_company_ar' => 'بروموبيل السنغال',
    ];

    public function __construct(private readonly PlatformSettingsService $settings) {}

    /**
     * Stored overrides merged onto the defaults, with logo_path resolved to
     * a public logo_url. Used as-is by both the public endpoint and the
     * admin edit form.
     */
    public function get(): array
    {
        $merged = array_merge(self::DEFAULTS, $this->stored());
        $merged['logo_url'] = $merged['logo_path'] ? Storage::disk(self::LOGO_DISK)->url($merged['logo_path']) : null;

        return $merged;
    }

    public function update(array $fields, ?AdminUser $admin = null): array
    {
        $this->persist(array_merge($this->stored(), $fields), $admin);

        return $this->get();
    }

    public function updateLogo(UploadedFile $file, ?AdminUser $admin = null): array
    {
        $current = $this->stored();

        if (! empty($current['logo_path'])) {
            Storage::disk(self::LOGO_DISK)->delete($current['logo_path']);
        }

        $current['logo_path'] = $file->store(self::LOGO_DIRECTORY, self::LOGO_DISK);
        $this->persist($current, $admin);

        return $this->get();
    }

    public function removeLogo(?AdminUser $admin = null): array
    {
        $current = $this->stored();

        if (! empty($current['logo_path'])) {
            Storage::disk(self::LOGO_DISK)->delete($current['logo_path']);
        }

        unset($current['logo_path']);
        $this->persist($current, $admin);

        return $this->get();
    }

    private function stored(): array
    {
        return json_decode($this->settings->get(self::SETTING_KEY) ?? '', true) ?? [];
    }

    private function persist(array $fields, ?AdminUser $admin): void
    {
        $this->settings->set(self::SETTING_KEY, json_encode($fields), $admin);
    }
}
