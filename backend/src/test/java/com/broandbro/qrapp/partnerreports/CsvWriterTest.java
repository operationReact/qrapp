package com.broandbro.qrapp.partnerreports;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CsvWriterTest {
    @Test
    void neutralisesEveryFormulaTrigger() {
        for (String lead : new String[]{"=", "+", "-", "@", "\t", "\r", "\n"}) {
            String cell = CsvWriter.cell(lead + "SUM(A1)");
            assertEquals("\"'" + lead + "SUM(A1)\"", cell, "lead=" + (int) lead.charAt(0));
        }
    }

    @Test
    void quotesCommasQuotesAndLineBreaksPerRfc4180() {
        assertEquals("\"a,b\"", CsvWriter.cell("a,b"));
        assertEquals("\"say \"\"hi\"\"\"", CsvWriter.cell("say \"hi\""));
        assertEquals("\"line1\nline2\"", CsvWriter.cell("line1\nline2"));
        assertEquals("", CsvWriter.cell(null));
        assertEquals("\"\"", CsvWriter.cell(""));
    }

    @Test
    void numbersAndDatesAreRawSoNegativeAmountsStayNumeric() {
        assertEquals("-12.50", CsvWriter.cell(new BigDecimal("-12.50")));
        assertEquals("7", CsvWriter.cell(7L));
        assertEquals("2026-10-01", CsvWriter.cell(java.time.LocalDate.of(2026, 10, 1)));
    }

    @Test
    void rowsEndWithCrlf() {
        String out = new String(new CsvWriter().row("a", 1).blank().toBytes(), StandardCharsets.UTF_8);
        assertEquals("\"a\",1\r\n\r\n", out);
    }
}