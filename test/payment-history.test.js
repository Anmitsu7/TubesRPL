import { JSDOM } from 'jsdom';
import ejs from 'ejs';
import { expect } from 'chai';

describe('Pengujian Halaman Riwayat Pembayaran', () => {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Riwayat Pembayaran</title>
    <link rel="stylesheet" href="/css/riwayat-pembayaran.css">
</head>
<body>
    <header>
        <h1>Riwayat Pembayaran</h1>
    </header>
    <div class="payment-history-container">
        <h2>Histori Pembayaran</h2>
        <% if (transactions && transactions.length > 0) { %>
            <table class="payment-history-table">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Dokter</th>
                        <th>Total Biaya</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <% transactions.forEach(function(transaksi) { %>
                        <tr>
                            <td>#<%= transaksi.id.toString().padStart(5, '0') %></td>
                            <td><%= new Date(transaksi.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            }) %></td>
                            <td><%= transaksi.namaDokter || 'Tidak tersedia' %></td>
                            <td>Rp <%= parseFloat(transaksi.totalBiaya).toLocaleString('id-ID', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }) %></td>
                            <td>
                                <span class="status-<%= transaksi.status.toLowerCase() %>">
                                    <%= transaksi.status %>
                                </span>
                            </td>
                        </tr>
                    <% }); %>
                </tbody>
            </table>
        <% } else { %>
            <div class="no-transactions">
                <p>Tidak ada riwayat transaksi pembayaran.</p>
            </div>
        <% } %>
    </div>
</body>
</html>`;

    function renderTemplate(data) {
        const html = ejs.render(template, data);
        const dom = new JSDOM(html);
        return dom.window.document;
    }

    describe('Pengujian Tampilan', () => {
        it('Menampilkan judul halaman', () => {
            const document = renderTemplate({ transactions: [] });
            const title = document.querySelector('h1').textContent;
            expect(title).to.equal('Riwayat Pembayaran');
        });

        it('Menampilkan pesan "tidak ada transaksi" saat data kosong', () => {
            const document = renderTemplate({ transactions: [] });
            const message = document.querySelector('.no-transactions p').textContent;
            expect(message).to.equal('Tidak ada riwayat transaksi pembayaran.');
        });

        it('Menampilkan tabel saat ada data transaksi', () => {
            const transactions = [{
                id: 1,
                tanggal: '2024-03-15',
                namaDokter: 'Dr. John Doe',
                totalBiaya: 150000,
                status: 'LUNAS'
            }];
            
            const document = renderTemplate({ transactions });
            const table = document.querySelector('.payment-history-table');
            expect(table).to.not.be.null;
        });
    });

    describe('Pengujian Tampilan Data Transaksi', () => {
        const sampleTransaction = {
            id: 123,
            tanggal: '2024-03-15',
            namaDokter: 'Dr. John Doe',
            totalBiaya: 150000,
            status: 'LUNAS'
        };

        let document;

        beforeEach(() => {
            document = renderTemplate({ transactions: [sampleTransaction] });
        });


        it('Memformat tanggal sesuai dengan tanggal transaksi', () => {
            const dateCell = document.querySelector('tbody tr td:nth-child(2)');
            expect(dateCell.textContent).to.include('15 Maret 2024');
        });

        it('Memformat mata uang menjadi Rupiah', () => {
            const priceCell = document.querySelector('tbody tr td:nth-child(4)');
            expect(priceCell.textContent.trim()).to.equal('Rp 150.000');
        });

        it('Menampilkan "Tidak ada dokter" ketika kolom dokter kosong', () => {
            const transactionNoDoctor = { ...sampleTransaction, namaDokter: null };
            document = renderTemplate({ transactions: [transactionNoDoctor] });
            const doctorCell = document.querySelector('tbody tr td:nth-child(3)');
            expect(doctorCell.textContent).to.equal('Tidak tersedia');
        });

        it('Menampilkan status transaksi', () => {
            const transaction = {
                id: 1,
                tanggal: '2024-03-15',
                namaDokter: 'Dr. John Doe',
                totalBiaya: 150000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const statusSpan = document.querySelector('.status-lunas');
            expect(statusSpan).to.not.be.null;
            expect(statusSpan.textContent.trim()).to.equal('LUNAS');
        });
    });

    describe('Pengujian Kasus Khusus', () => {
        it('Dapat menangani angka yang sangat besar', () => {
            const transaction = {
                id: 999999,
                tanggal: '2024-03-15',
                namaDokter: 'Dr. John Doe',
                totalBiaya: 1000000000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const priceCell = document.querySelector('tbody tr td:nth-child(4)');
            expect(priceCell.textContent.trim()).to.equal('Rp 1.000.000.000');
        });

        it('Dapat menangani karakter khusus dalam nama dokter', () => {
            const transaction = {
                id: 1,
                tanggal: '2024-03-15',
                namaDokter: 'Dr. John & Jane Doe',
                totalBiaya: 150000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const doctorCell = document.querySelector('tbody tr td:nth-child(3)');
            expect(doctorCell.textContent).to.equal('Dr. John & Jane Doe');
        });
    });
});