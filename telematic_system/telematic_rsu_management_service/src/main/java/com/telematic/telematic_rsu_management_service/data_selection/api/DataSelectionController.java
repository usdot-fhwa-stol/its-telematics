package com.telematic.telematic_rsu_management_service.data_selection.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.telematic.telematic_rsu_management_service.data_selection.dto.TRUTopicsMessage;
import com.telematic.telematic_rsu_management_service.data_selection.service.DataSelectionService;

@RestController
@RequestMapping("/api/data-selection")
public class DataSelectionController {
    private final DataSelectionService dataSelectionService;
    public DataSelectionController(DataSelectionService dataSelectionService) {
        this.dataSelectionService = dataSelectionService;
    }

    @GetMapping("/tru-topics")
    public ResponseEntity<?> getAvailableTopics(@RequestBody TRUTopicsMessage truTopicsMessage) {
         TRUTopicsMessage response = dataSelectionService.requestAvailableTopics(truTopicsMessage);
         return ResponseEntity.ok().body(response);
    }

    @PostMapping("/confirm-selection")
    public ResponseEntity<?> confirmDataSelection(@RequestBody TRUTopicsMessage truTopicsMessage) {
        TRUTopicsMessage response = dataSelectionService.requestDataSelection(truTopicsMessage);
        return ResponseEntity.ok().body(response);
    }
}
