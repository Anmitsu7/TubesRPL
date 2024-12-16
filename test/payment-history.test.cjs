const { JSDOM } = require('jsdom');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

describe('Payment History Page Tests', () => {
    let template;
    
    before(() => {
        // Load the EJS template
        template = fs.readFileSync(path.resolve(__dirname, '../views/riwayat-pembayaran.ejs'), 'utf8');
    });

    function renderTemplate(data) {
        const html = ejs.render(template, data);
        const dom = new JSDOM(html);
        return dom.window.document;
    }

    describe('Rendering Tests', () => {
        it('should render page title correctly', () => {
            const document = renderTemplate({ transactions: [] });
            const title = document.querySelector('h1').textContent;
            expect(title).to.equal('Riwayat Pembayaran');
        });

        it('should display "no transactions" message when transactions array is empty', () => {
            const document = renderTemplate({ transactions: [] });
            const message = document.querySelector('.no-transactions p').textContent;
            expect(message).to.equal('Tidak ada riwayat transaksi pembayaran.');
        });

        it('should render table when transactions exist', () => {
            const transactions = [{
                id: 1,
                tanggal: '2024-03-15T10:30:00',
                namaDokter: 'Dr. Smith',
                totalBiaya: 150000,
                status: 'LUNAS'
            }];
            
            const document = renderTemplate({ transactions });
            const table = document.querySelector('.payment-history-table');
            expect(table).to.not.be.null;
        });
    });

    describe('Transaction Data Display Tests', () => {
        const sampleTransaction = {
            id: 123,
            tanggal: '2024-03-15T10:30:00',
            namaDokter: 'Dr. Smith',
            totalBiaya: 150000,
            status: 'LUNAS'
        };

        let document;

        beforeEach(() => {
            document = renderTemplate({ transactions: [sampleTransaction] });
        });

        it('should format transaction ID with leading zeros', () => {
            const idCell = document.querySelector('tbody tr td:first-child');
            expect(idCell.textContent).to.equal('#00123');
        });

        it('should format date in Indonesian locale', () => {
            const dateCell = document.querySelector('tbody tr td:nth-child(2)');
            expect(dateCell.textContent).to.include('15 Maret 2024');
        });

        it('should format currency in Indonesian format', () => {
            const priceCell = document.querySelector('tbody tr td:nth-child(4)');
            expect(priceCell.textContent.trim()).to.equal('Rp 150.000');
        });

        it('should display "Tidak tersedia" when doctor name is missing', () => {
            const transactionNoDoctor = { ...sampleTransaction, namaDokter: null };
            document = renderTemplate({ transactions: [transactionNoDoctor] });
            const doctorCell = document.querySelector('tbody tr td:nth-child(3)');
            expect(doctorCell.textContent).to.equal('Tidak tersedia');
        });
    });

    describe('Status Display Tests', () => {
        it('should apply correct status class', () => {
            const transaction = {
                id: 1,
                tanggal: '2024-03-15T10:30:00',
                namaDokter: 'Dr. Smith',
                totalBiaya: 150000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const statusSpan = document.querySelector('.status-lunas');
            expect(statusSpan).to.not.be.null;
            expect(statusSpan.textContent.trim()).to.equal('LUNAS');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large numbers correctly', () => {
            const transaction = {
                id: 999999,
                tanggal: '2024-03-15T10:30:00',
                namaDokter: 'Dr. Smith',
                totalBiaya: 1000000000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const priceCell = document.querySelector('tbody tr td:nth-child(4)');
            expect(priceCell.textContent.trim()).to.equal('Rp 1.000.000.000');
        });

        it('should handle special characters in doctor names', () => {
            const transaction = {
                id: 1,
                tanggal: '2024-03-15T10:30:00',
                namaDokter: 'Dr. Smith & Co.',
                totalBiaya: 150000,
                status: 'LUNAS'
            };
            
            const document = renderTemplate({ transactions: [transaction] });
            const doctorCell = document.querySelector('tbody tr td:nth-child(3)');
            expect(doctorCell.textContent).to.equal('Dr. Smith & Co.');
        });
    });
});