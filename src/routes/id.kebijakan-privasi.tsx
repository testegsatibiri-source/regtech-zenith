import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/id/kebijakan-privasi")({
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi — Program Validasi Pilot Indonesia | UBoard Asia" },
      {
        name: "description",
        content:
          "Kebijakan privasi untuk program validasi pilot UBoard Asia di Indonesia. Penanganan data pribadi, hak pemohon, dan jangka waktu penyimpanan.",
      },
      {
        property: "og:title",
        content: "Kebijakan Privasi — Program Validasi Pilot Indonesia | UBoard Asia",
      },
      {
        property: "og:description",
        content: "Kebijakan privasi untuk program validasi pilot UBoard Asia di Indonesia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "id_ID" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdPrivacyPolicy,
});

function IdPrivacyPolicy() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/id" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali ke halaman Indonesia
        </Link>
        <h1 className="mt-6 mb-4 text-3xl font-semibold tracking-tight">
          Kebijakan Privasi Program Validasi Pilot
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">Versi 1.0 — berlaku per 8 September 2026</p>
        <Card>
          <CardContent className="space-y-6 pt-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">1. Data yang kami kumpulkan</h2>
              <p>
                Saat Anda mengajukan permohonan akses pilot, kami mengumpulkan nama lengkap, email
                perusahaan, nama entitas/perusahaan, rentang jumlah karyawan, peran, serta alamat IP
                (disimpan dalam bentuk hash satu arah). Kami tidak meminta NIK, NPWP, nomor rekening
                bank, atau dokumen identitas lainnya melalui formulir ini.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">2. Tujuan penggunaan data</h2>
              <p>
                Data digunakan untuk menilai kesesuaian program pilot, menghubungi pemohon, dan
                memenuhi kewajiban audit internal. Kami tidak menjual atau membagikan data pribadi
                kepada pihak ketiga untuk tujuan pemasaran.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">
                3. Dasar hukum dan persetujuan
              </h2>
              <p>
                Pengumpulan data didasarkan pada persetujuan eksplisit Anda (Pasal 20 UU PDP No.
                27/2022). Anda dapat menarik persetujuan kapan saja dengan menghubungi kami, dengan
                memahami bahwa penarikan tidak memengaruhi pemrosesan yang telah sah dilakukan
                sebelumnya.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">4. Jangka waktu penyimpanan</h2>
              <p>
                Data pilot disimpan selama maksimal 24 bulan sejak pengajuan. Setelah masa tersebut,
                data akan dihapus atau dianonimkan sesuai kebijakan retensi yang berlaku.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">5. Hak pemohon</h2>
              <p>
                Anda berhak mengakses, memperbaiki, atau menghapus data pribadi Anda. Permintaan dapat
                diajukan melalui email yang tercantum di halaman kontak.
              </p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-medium text-foreground">6. Perubahan kebijakan</h2>
              <p>
                Setiap perubahan material akan diberitahukan melalui email. Versi persetujuan yang
                Anda terima saat pengajuan tetap tercatat bersama data Anda.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
