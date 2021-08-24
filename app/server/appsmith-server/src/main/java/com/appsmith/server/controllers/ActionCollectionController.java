package com.appsmith.server.controllers;

import com.appsmith.server.constants.Url;
import com.appsmith.server.dtos.ActionCollectionDTO;
import com.appsmith.server.dtos.ActionCollectionMoveDTO;
import com.appsmith.server.dtos.LayoutDTO;
import com.appsmith.server.dtos.RefactorActionCollectionNameDTO;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.services.ActionCollectionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping(Url.ACTION_COLLECTION_URL)
@Slf4j
public class ActionCollectionController {
    private final ActionCollectionService actionCollectionService;

    @Autowired
    public ActionCollectionController(ActionCollectionService actionCollectionService) {
        this.actionCollectionService = actionCollectionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseDTO<ActionCollectionDTO>> create(@Valid @RequestBody ActionCollectionDTO resource) {
        log.debug("Going to create resource {}", resource.getClass().getName());
        return actionCollectionService.createCollection(resource)
                .map(created -> new ResponseDTO<>(HttpStatus.CREATED.value(), created, null));
    }

    @GetMapping("")
    public Mono<ResponseDTO<List<ActionCollectionDTO>>> getAllUnpublishedActionCollections(@RequestParam MultiValueMap<String, String> params) {
        log.debug("Going to get all action collections with params : {}", params);
        return actionCollectionService.getPopulatedActionCollectionsByViewMode(params, false)
                .collectList()
                .map(resources -> new ResponseDTO<>(HttpStatus.OK.value(), resources, null));
    }

    @PutMapping("/move")
    public Mono<ResponseDTO<ActionCollectionDTO>> moveActionCollection(@RequestBody @Valid ActionCollectionMoveDTO actionCollectionMoveDTO) {
        log.debug("Going to move action collection with id {} to page {}", actionCollectionMoveDTO.getCollectionId(), actionCollectionMoveDTO.getDestinationPageId());
        return actionCollectionService.moveCollection(actionCollectionMoveDTO)
                .map(actionCollection -> new ResponseDTO<>(HttpStatus.OK.value(), actionCollection, null));
    }

    @PutMapping("/refactor")
    public Mono<ResponseDTO<LayoutDTO>> refactorActionCollectionName(@RequestBody RefactorActionCollectionNameDTO refactorActionCollectionNameDTO) {
        return actionCollectionService.refactorCollectionName(refactorActionCollectionNameDTO)
                .map(created -> new ResponseDTO<>(HttpStatus.OK.value(), created, null));
    }

    @GetMapping("/view")
    public Mono<ResponseDTO<List<ActionCollectionDTO>>> getAllPublishedActionCollections(@RequestParam MultiValueMap<String, String> params) {
        log.debug("Going to get all action collections with params : {}", params);
        return actionCollectionService.getPopulatedActionCollectionsByViewMode(params, true)
                .collectList()
                .map(resources -> new ResponseDTO<>(HttpStatus.OK.value(), resources, null));
    }

    @PutMapping("/{id}")
    public Mono<ResponseDTO<ActionCollectionDTO>> updateActionCollection(@PathVariable String id, @Valid @RequestBody ActionCollectionDTO resource) {
        log.debug("Going to update action collection with id: {}", id);
        return actionCollectionService.updateUnpublishedActionCollection(id, resource)
                .map(updatedResource -> new ResponseDTO<>(HttpStatus.OK.value(), updatedResource, null));
    }

    @PutMapping("/{id}/refactor")
    public Mono<ResponseDTO<ActionCollectionDTO>> refactorActionCollection(@PathVariable String id, @Valid @RequestBody ActionCollectionDTO resource) {
        log.debug("Going to refactor action collection with id: {}", id);
        return actionCollectionService.refactorCollection(id, resource)
                .map(updatedResource -> new ResponseDTO<>(HttpStatus.OK.value(), updatedResource, null));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseDTO<ActionCollectionDTO>> deleteActionCollection(@PathVariable String id) {
        log.debug("Going to delete unpublished action collection with id: {}", id);
        return actionCollectionService.deleteUnpublishedActionCollection(id)
                .map(deletedResource -> new ResponseDTO<>(HttpStatus.OK.value(), deletedResource, null));
    }

}
